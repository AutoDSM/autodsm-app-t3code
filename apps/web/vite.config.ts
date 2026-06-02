import tailwindcss from "@tailwindcss/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import { defineConfig, loadEnv } from "vite";
import pkg from "./package.json" with { type: "json" };

function readEnvVar(name: string, env: Record<string, string>): string {
  return process.env[name]?.trim() || env[name]?.trim() || "";
}

function resolveHostedAppUrl(env: Record<string, string>): string | undefined {
  const explicitHostedAppUrl = readEnvVar("VITE_HOSTED_APP_URL", env);
  if (explicitHostedAppUrl) {
    return explicitHostedAppUrl;
  }
  if (process.env.VERCEL_ENV === "production" && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return undefined;
}

function resolveDevProxyTarget(wsUrl: string | undefined): string | undefined {
  if (!wsUrl) {
    return undefined;
  }

  try {
    const url = new URL(wsUrl);
    if (url.protocol === "ws:") {
      url.protocol = "http:";
    } else if (url.protocol === "wss:") {
      url.protocol = "https:";
    }
    url.pathname = "";
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return undefined;
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const port = Number(process.env.PORT ?? env.PORT ?? 5733);
  const host = process.env.HOST?.trim() || env.HOST?.trim() || "localhost";
  const configuredWsUrl = readEnvVar("VITE_WS_URL", env) || undefined;
  const configuredHostedAppChannel = readEnvVar("VITE_HOSTED_APP_CHANNEL", env);
  const configuredSupabaseUrl = readEnvVar("VITE_SUPABASE_URL", env);
  const configuredSupabaseAnonKey = readEnvVar("VITE_SUPABASE_ANON_KEY", env);
  const configuredAppVersion = process.env.APP_VERSION?.trim() || pkg.version;
  const configuredHostedAppUrl = resolveHostedAppUrl(env);
  const sourcemapEnv = process.env.T3CODE_WEB_SOURCEMAP?.trim().toLowerCase();

  const buildSourcemap =
    sourcemapEnv === "0" || sourcemapEnv === "false"
      ? false
      : sourcemapEnv === "hidden"
        ? "hidden"
        : true;

  const devProxyTarget = resolveDevProxyTarget(configuredWsUrl);

  // Explicit `T3CODE_REQUIRE_SUPABASE=0` opts out of the gate even on tag builds
  // (per the error message below). Used by the Preflight check job, whose web
  // build is for lint/test only — the shippable build/deploy jobs supply the
  // real secrets and leave this unset so the tag gate applies there.
  const requireSupabaseEnv = process.env.T3CODE_REQUIRE_SUPABASE;
  const isCiReleaseBuild =
    process.env.CI === "true" &&
    requireSupabaseEnv !== "0" &&
    (requireSupabaseEnv === "1" || process.env.GITHUB_REF_TYPE === "tag");

  if (
    isCiReleaseBuild &&
    (configuredSupabaseUrl.length === 0 || configuredSupabaseAnonKey.length === 0)
  ) {
    throw new Error(
      "Release build requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. Set GitHub Actions secrets or T3CODE_REQUIRE_SUPABASE=0 to skip.",
    );
  }

  return {
    plugins: [
      tanstackRouter({
        target: "react",
        routesDirectory: "./src/routes",
        generatedRouteTree: "./src/routeTree.gen.ts",
      }),
      react(),
      babel({
        // We need to be explicit about the parser options after moving to @vitejs/plugin-react v6.0.0
        // This is because the babel plugin only automatically parses typescript and jsx based on relative paths (e.g. "**/*.ts")
        // whereas the previous version of the plugin parsed all files with a .ts extension.
        // This is causing our packages/ directory to fail to parse, as they are not relative to the CWD.
        parserOpts: { plugins: ["typescript", "jsx"] },
        presets: [reactCompilerPreset()],
      }),
      tailwindcss(),
    ],
    optimizeDeps: {
      include: [
        "@pierre/diffs",
        "@pierre/diffs/react",
        "@pierre/diffs/worker/worker.js",
        "effect/Array",
        "effect/Order",
      ],
    },
    define: {
      // In dev mode, tell the web app where the WebSocket server lives
      "import.meta.env.VITE_WS_URL": JSON.stringify(configuredWsUrl ?? ""),
      "import.meta.env.VITE_HOSTED_APP_URL": JSON.stringify(configuredHostedAppUrl ?? ""),
      "import.meta.env.VITE_HOSTED_APP_CHANNEL": JSON.stringify(configuredHostedAppChannel),
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(configuredSupabaseUrl),
      "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(configuredSupabaseAnonKey),
      "import.meta.env.APP_VERSION": JSON.stringify(configuredAppVersion),
    },
    resolve: {
      tsconfigPaths: true,
    },
    server: {
      host,
      port,
      strictPort: true,
      watch: {
        // TanStack Router writes routeTree.gen.ts during dev; without this ignore Vite
        // re-triggers generation on its own output and loops full-page reloads (macOS/APFS).
        ignored: ["**/routeTree.gen.ts"],
      },
      ...(devProxyTarget
        ? {
            proxy: {
              "/.well-known": {
                target: devProxyTarget,
                changeOrigin: true,
              },
              "/api": {
                target: devProxyTarget,
                changeOrigin: true,
              },
              "/attachments": {
                target: devProxyTarget,
                changeOrigin: true,
              },
            },
          }
        : {}),
      hmr: {
        // Explicit config so Vite's HMR WebSocket connects reliably
        // inside Electron's BrowserWindow. Vite 8 uses console.debug for
        // connection logs — enable "Verbose" in DevTools to see them.
        protocol: "ws",
        host,
      },
    },
    build: {
      outDir: "dist",
      emptyOutDir: true,
      sourcemap: buildSourcemap,
    },
  };
});
