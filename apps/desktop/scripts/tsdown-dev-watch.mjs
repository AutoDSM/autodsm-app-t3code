#!/usr/bin/env node
/**
 * Desktop dev bundling without Rolldown/tsdown native watch.
 *
 * Native watch uses FSEvents on macOS and fails under tight watcher / FD limits
 * ("unable to start FSEvent stream"). This script polls source mtimes and runs a
 * plain `tsdown` build when inputs change.
 *
 * Opt in to native watch: T3CODE_DESKTOP_TSDOWN_NATIVE_WATCH=1
 * Tune poll interval (ms): T3CODE_DESKTOP_TSDOWN_POLL_MS (default 400)
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, statSync, writeFileSync } from "node:fs";
import { access, glob } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

import {
  DEV_BUILD_READY_SENTINEL_RELATIVE,
  fingerprintWatchedOutputFiles,
} from "./dev-electron-supervisor-utils.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const desktopDir = resolve(__dirname, "..");
const repoRoot = resolve(desktopDir, "..", "..");

const pollMsRaw = process.env.T3CODE_DESKTOP_TSDOWN_POLL_MS;
const pollMs =
  Number.isFinite(Number(pollMsRaw)) && Number(pollMsRaw) > 0 ? Number(pollMsRaw) : 400;

const bundledWorkspaceSrcRoots = [
  join(desktopDir, "src"),
  join(repoRoot, "packages", "contracts", "src"),
  join(repoRoot, "packages", "shared", "src"),
  join(repoRoot, "packages", "ssh", "src"),
  join(repoRoot, "packages", "tailscale", "src"),
];

function resolveTsdownBin() {
  const bin = join(
    desktopDir,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "tsdown.cmd" : "tsdown",
  );
  return existsSync(bin) ? bin : null;
}

const desktopOutputWatchTargets = [
  { directory: "dist-electron", files: new Set(["main.cjs", "preload.cjs"]) },
];

function writeDevBuildReadySentinel() {
  const outputFingerprint = fingerprintWatchedOutputFiles(desktopDir, desktopOutputWatchTargets);
  const payload = {
    writtenAtMs: Date.now(),
    outputFingerprint,
  };
  writeFileSync(
    join(desktopDir, DEV_BUILD_READY_SENTINEL_RELATIVE),
    `${JSON.stringify(payload, null, 2)}\n`,
    "utf8",
  );
}

function runTsdownOnce() {
  const bin = resolveTsdownBin();
  const env = {
    ...process.env,
    T3CODE_DESKTOP_DEV_BUILD: "1",
  };
  const result = bin
    ? spawnSync(bin, [], { cwd: desktopDir, stdio: "inherit", env })
    : spawnSync("tsdown", [], { cwd: desktopDir, stdio: "inherit", env, shell: true });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`tsdown exited with status ${result.status ?? "unknown"}`);
  }

  writeDevBuildReadySentinel();
}

/** @param {string} dir */
async function collectTsFilesFromDir(dir) {
  /** @type {string[]} */
  const files = [];
  try {
    await access(dir);
  } catch {
    return files;
  }

  for (const ext of ["ts", "mts", "cts"]) {
    const pattern = `**/*.${ext}`;
    for await (const rel of glob(pattern, { cwd: dir })) {
      files.push(join(dir, rel));
    }
  }

  return files;
}

async function collectWatchTargets() {
  /** @type {string[]} */
  const files = [];

  for (const dir of bundledWorkspaceSrcRoots) {
    files.push(...(await collectTsFilesFromDir(dir)));
  }

  const configPath = join(desktopDir, "tsdown.config.ts");
  try {
    await access(configPath);
    files.push(configPath);
  } catch {
    // ignore
  }

  return [...new Set(files)];
}

/** @param {readonly string[]} paths */
function fingerprintFiles(paths) {
  const lines = [];
  for (const p of [...paths].toSorted()) {
    try {
      const s = statSync(p);
      lines.push(`${p}\0${s.mtimeMs}\0${s.size}`);
    } catch {
      lines.push(`${p}\0missing`);
    }
  }
  return lines.join("\n");
}

async function fingerprintInputs() {
  const targets = await collectWatchTargets();
  return fingerprintFiles(targets);
}

function runNativeWatch() {
  const bin = resolveTsdownBin();
  const child = bin
    ? spawn(bin, ["--watch"], { cwd: desktopDir, stdio: "inherit", env: process.env })
    : spawn("tsdown", ["--watch"], {
        cwd: desktopDir,
        stdio: "inherit",
        env: process.env,
        shell: true,
      });

  child.once("error", (err) => {
    console.error("[tsdown-dev-watch] failed to start tsdown --watch:", err);
    process.exit(1);
  });

  child.once("exit", (code, signal) => {
    if (signal) {
      process.exit(1);
    }
    process.exit(code ?? 0);
  });

  process.once("SIGINT", () => {
    child.kill("SIGINT");
  });
  process.once("SIGTERM", () => {
    child.kill("SIGTERM");
  });
}

async function pollingLoop() {
  let lastFingerprint = "";

  process.once("SIGINT", () => {
    process.exit(130);
  });
  process.once("SIGTERM", () => {
    process.exit(143);
  });

  for (;;) {
    try {
      const fp = await fingerprintInputs();
      if (fp !== lastFingerprint) {
        try {
          runTsdownOnce();
          lastFingerprint = await fingerprintInputs();
        } catch (err) {
          console.error("[tsdown-dev-watch] rebuild failed:", err);
        }
      }
    } catch (err) {
      console.error("[tsdown-dev-watch] poll failed:", err);
    }

    await delay(pollMs);
  }
}

if (process.env.T3CODE_DESKTOP_TSDOWN_NATIVE_WATCH === "1") {
  runNativeWatch();
} else {
  await pollingLoop();
}
