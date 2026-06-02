// @effect-diagnostics nodeBuiltinImport:off
import * as http from "node:http";
import * as path from "node:path";

import type { Plugin as VitePlugin, InlineConfig as ViteInlineConfig, ViteDevServer } from "vite";

import { sha256Hex } from "../autoDsmHelpers.ts";

export interface AutodsmPreviewSidecar {
  readonly port: number;
  readonly origin: string;
  readonly dispose: () => Promise<void>;
}

const sidecars = new Map<string, AutodsmPreviewSidecar>();

export function peekAutodsmPreviewSidecar(cwd: string): AutodsmPreviewSidecar | undefined {
  const resolvedRoot = path.resolve(cwd);
  return sidecars.get(resolvedRoot);
}

/**
 * Dispose every running preview sidecar (Vite/Bun/HTTP). Called on server
 * shutdown so child preview servers don't outlive the backend process — without
 * this they leak when the desktop app quits and SIGKILLs the backend.
 */
export async function disposeAllAutodsmPreviewSidecars(): Promise<void> {
  const active = [...sidecars.values()];
  await Promise.allSettled(active.map((sidecar) => sidecar.dispose()));
  sidecars.clear();
}

export function previewSidecarPortHint(resolvedAbsoluteCwd: string): number {
  const n = Number.parseInt(sha256Hex(resolvedAbsoluteCwd).slice(0, 8), 16);
  return 5180 + (Math.abs(n) % 10);
}

function httpFallbackServe(
  resolved: string,
  preferredPort: number,
): Promise<AutodsmPreviewSidecar> {
  const port = preferredPort;
  const origin = `http://127.0.0.1:${port}`;

  const server = http.createServer((req, res) => {
    const url = req.url ?? "";
    if (url.startsWith("/__t3_autodsm/health")) {
      res.writeHead(200, {
        "content-type": "application/json",
        "content-security-policy": "default-src 'none'",
      });
      res.end(JSON.stringify({ ok: true, kind: "fallback-http", cwd: resolved }));
      return;
    }

    res.writeHead(200, {
      "content-type": "text/html; charset=utf-8",
      "content-security-policy": "default-src 'none'",
    });
    res.end("<!doctype html><title>autodsm-preview</title>");
  });

  return new Promise<AutodsmPreviewSidecar>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      resolve({
        port,
        origin,
        dispose: async () =>
          await new Promise<void>((res, rej) => {
            server.close((err) => (err ? rej(err) : res()));
          }),
      });
    });
  });
}

function viteHealthPlugin(workspaceRootResolved: string): VitePlugin {
  return {
    name: "t3-autodsm-sidecar-health",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const method = req.method ?? "GET";
        const url = req.url ?? "";
        if ((method === "GET" || method === "HEAD") && url.startsWith("/__t3_autodsm/health")) {
          res.statusCode = 200;
          res.setHeader("content-type", "application/json");
          res.setHeader(
            "content-security-policy",
            "default-src 'none'; script-src 'none'; frame-ancestors 'none'",
          );
          res.end(JSON.stringify({ ok: true, kind: "vite", cwd: workspaceRootResolved }));
          return;
        }
        next();
      });
    },
  };
}

async function tryStartVite(resolvedRoot: string, portHint: number): Promise<ViteDevServer | null> {
  try {
    const { createServer } = await import("vite");

    const config = {
      root: resolvedRoot,
      appType: "custom",
      mode: "development",
      server: {
        strictPort: false,
        middlewareMode: false as const,
        host: "127.0.0.1",
        port: portHint,
      },
      optimizeDeps: { holdUntilCrawlEnd: false },
      logLevel: "error",
      clearScreen: false,
      configFile: false as const,
      envDir: resolvedRoot,
      plugins: [viteHealthPlugin(resolvedRoot)],
    } satisfies ViteInlineConfig;

    const server = await createServer(config);
    await server.listen();
    return server;
  } catch {
    return null;
  }
}

export async function startAutodsmPreviewSidecar(rawCwd: string): Promise<AutodsmPreviewSidecar> {
  const resolvedRoot = path.resolve(rawCwd);
  const existing = sidecars.get(resolvedRoot);
  if (existing) {
    return existing;
  }

  const portHint = previewSidecarPortHint(resolvedRoot);

  const viteServer = await tryStartVite(resolvedRoot, portHint);
  if (viteServer !== null) {
    let port = viteServer.config.server.port ?? portHint;
    const addr = viteServer.httpServer?.address();
    if (
      addr !== null &&
      addr !== undefined &&
      typeof addr !== "string" &&
      typeof addr.port === "number"
    ) {
      port = addr.port;
    }
    const origin = `http://127.0.0.1:${port}`;
    const disposable: AutodsmPreviewSidecar = {
      port,
      origin,
      dispose: async () => {
        await viteServer.close();
        sidecars.delete(resolvedRoot);
      },
    };
    sidecars.set(resolvedRoot, disposable);
    return disposable;
  }

  if (typeof Bun !== "undefined" && typeof Bun.serve === "function") {
    const server = Bun.serve({
      hostname: "127.0.0.1",
      port: portHint,
      fetch(req: Request): Response | Promise<Response> {
        const url = new URL(req.url);
        if (url.pathname.startsWith("/__t3_autodsm/health")) {
          return new Response(JSON.stringify({ ok: true, kind: "bun", cwd: resolvedRoot }), {
            headers: {
              "content-type": "application/json",
              "content-security-policy": "default-src 'none'",
            },
          });
        }

        return new Response("<!doctype html><title>autodsm-preview</title>", {
          headers: {
            "content-type": "text/html; charset=utf-8",
            "content-security-policy":
              "default-src 'none'; script-src 'unsafe-inline'; base-uri 'none'",
          },
        });
      },
    });

    const port = typeof server.port === "number" ? server.port : portHint;
    const origin = `http://127.0.0.1:${port}`;
    const disposable: AutodsmPreviewSidecar = {
      port,
      origin,
      dispose: async () => {
        server.stop();
        sidecars.delete(resolvedRoot);
      },
    };
    sidecars.set(resolvedRoot, disposable);
    return disposable;
  }

  try {
    const disposable = await httpFallbackServe(resolvedRoot, portHint);
    sidecars.set(resolvedRoot, {
      ...disposable,
      dispose: async () => {
        await disposable.dispose();
        sidecars.delete(resolvedRoot);
      },
    });
    return sidecars.get(resolvedRoot)!;
  } catch {
    const disposable = await httpFallbackServe(resolvedRoot, portHint + 7);
    sidecars.set(resolvedRoot, {
      ...disposable,
      dispose: async () => {
        await disposable.dispose();
        sidecars.delete(resolvedRoot);
      },
    });
    return sidecars.get(resolvedRoot)!;
  }
}
