import { spawn, spawnSync } from "node:child_process";
import { statSync } from "node:fs";
import { watch } from "node:fs";
import { join } from "node:path";

import { desktopDir, getElectronLaunchInfo, resolveElectronPath } from "./electron-launcher.mjs";
import { waitForResources } from "./wait-for-resources.mjs";

const devServerUrl = process.env.VITE_DEV_SERVER_URL?.trim();
if (!devServerUrl) {
  throw new Error("VITE_DEV_SERVER_URL is required for desktop development.");
}

const devServer = new URL(devServerUrl);
const port = Number.parseInt(devServer.port, 10);
if (!Number.isInteger(port) || port <= 0) {
  throw new Error(`VITE_DEV_SERVER_URL must include an explicit port: ${devServerUrl}`);
}

const requiredFiles = [
  "dist-electron/main.cjs",
  "dist-electron/preload.cjs",
  "../server/dist/bin.mjs",
];
const watchedDirectories = [
  { directory: "dist-electron", files: new Set(["main.cjs", "preload.cjs"]) },
  { directory: "../server/dist", files: new Set(["bin.mjs"]) },
];
const forcedShutdownTimeoutMs = 1_500;
const restartDebounceMs = 120;
const minRestartCooldownMs = 2_000;
const childTreeGracePeriodMs = 1_200;
const outputPollMsRaw = process.env.T3CODE_DESKTOP_OUTPUT_POLL_MS;
const outputPollMs =
  Number.isFinite(Number(outputPollMsRaw)) && Number(outputPollMsRaw) > 0
    ? Number(outputPollMsRaw)
    : 400;

await waitForResources({
  baseDir: desktopDir,
  files: requiredFiles,
  tcpHost: devServer.hostname,
  tcpPort: port,
});

const childEnv = { ...process.env };
delete childEnv.ELECTRON_RUN_AS_NODE;

const chromiumDevSwitches = [
  "--disable-http-cache",
  "--disable-features=CompressionDictionaryTransport,CompressionDictionaryTransportBackend,SharedDictionary",
  "--disable-logging",
];

let shuttingDown = false;
let restartTimer = null;
let currentApp = null;
let restartQueue = Promise.resolve();
const expectedExits = new WeakSet();
const watchers = [];
let outputPollTimer = null;
let lastAppStartAtMs = 0;
let restartGeneration = 0;

function logDevElectron(message, data = {}) {
  console.info(`[dev-electron] ${message}`, data);
}

function killChildTreeByPid(pid, signal) {
  if (process.platform === "win32" || typeof pid !== "number") {
    return;
  }

  spawnSync("pkill", [`-${signal}`, "-P", String(pid)], { stdio: "ignore" });
}

function cleanupStaleDevApps() {
  if (process.platform === "win32") {
    return;
  }

  spawnSync("pkill", ["-f", "--", `--t3code-dev-root=${desktopDir}`], { stdio: "ignore" });
}

function startApp() {
  if (shuttingDown || currentApp !== null) {
    return;
  }

  resolveElectronPath();
  const resolvedLaunchInfo = getElectronLaunchInfo();
  lastAppStartAtMs = Date.now();
  restartGeneration += 1;
  const generation = restartGeneration;

  logDevElectron("starting electron", {
    generation,
    ...resolvedLaunchInfo,
  });

  const app = spawn(
    resolveElectronPath(),
    ["dist-electron/main.cjs", ...chromiumDevSwitches, `--t3code-dev-root=${desktopDir}`],
    {
      cwd: desktopDir,
      env: childEnv,
      stdio: "inherit",
    },
  );

  currentApp = app;

  app.once("error", (error) => {
    if (currentApp === app) {
      currentApp = null;
    }

    logDevElectron("electron spawn error (will restart)", {
      generation,
      message: error instanceof Error ? error.message : String(error),
    });

    if (!shuttingDown) {
      scheduleRestart("spawn-error");
    }
  });

  app.once("exit", (code, signal) => {
    if (currentApp === app) {
      currentApp = null;
    }

    const expected = expectedExits.has(app);
    const exitedAbnormally = signal !== null || code !== 0;
    const kind = shuttingDown
      ? "shutdown"
      : expected
        ? "expected-restart"
        : exitedAbnormally
          ? "abnormal-exit"
          : "clean-exit";

    logDevElectron("electron exited", {
      generation,
      kind,
      code,
      signal,
      expectedRestart: expected,
    });

    if (!shuttingDown && !expected && exitedAbnormally) {
      scheduleRestart("abnormal-exit");
    }
  });
}

async function stopApp() {
  const app = currentApp;
  if (!app) {
    return;
  }

  currentApp = null;
  expectedExits.add(app);

  await new Promise((resolve) => {
    let settled = false;

    const finish = () => {
      if (settled) {
        return;
      }

      settled = true;
      resolve();
    };

    app.once("exit", finish);
    app.kill("SIGTERM");
    killChildTreeByPid(app.pid, "TERM");

    setTimeout(() => {
      if (settled) {
        return;
      }

      app.kill("SIGKILL");
      killChildTreeByPid(app.pid, "KILL");
      finish();
    }, forcedShutdownTimeoutMs).unref();
  });
}

function scheduleRestart(reason) {
  if (shuttingDown) {
    return;
  }

  if (restartTimer) {
    clearTimeout(restartTimer);
  }

  const elapsedSinceStart = Date.now() - lastAppStartAtMs;
  const cooldownRemaining = Math.max(0, minRestartCooldownMs - elapsedSinceStart);
  const delayMs = restartDebounceMs + cooldownRemaining;

  logDevElectron("scheduling electron restart", {
    reason,
    delayMs,
    cooldownRemaining,
  });

  restartTimer = setTimeout(() => {
    restartTimer = null;
    restartQueue = restartQueue
      .catch(() => undefined)
      .then(async () => {
        await stopApp();
        if (!shuttingDown) {
          startApp();
        }
      });
  }, delayMs);
}

function fingerprintOutputs() {
  const parts = [];
  for (const { directory, files } of watchedDirectories) {
    const dirAbs = join(desktopDir, directory);
    for (const name of files) {
      const abs = join(dirAbs, name);
      try {
        const s = statSync(abs);
        parts.push(`${directory}/${name}\0${s.mtimeMs}\0${s.size}`);
      } catch {
        parts.push(`${directory}/${name}\0missing`);
      }
    }
  }
  return parts.join("\n");
}

function startNativeOutputWatchers() {
  for (const { directory, files } of watchedDirectories) {
    const watcher = watch(
      join(desktopDir, directory),
      { persistent: true },
      (_eventType, filename) => {
        if (typeof filename !== "string" || !files.has(filename)) {
          return;
        }

        scheduleRestart("output-change");
      },
    );

    watcher.on("error", (err) => {
      console.error(
        "[dev-electron] fs.watch error (fall back to T3CODE_DESKTOP_OUTPUT_NATIVE_WATCH=0):",
        err,
      );
    });

    watchers.push(watcher);
  }
}

function startPollingOutputWatch() {
  let lastFingerprint = fingerprintOutputs();
  outputPollTimer = setInterval(() => {
    if (shuttingDown) {
      return;
    }

    const next = fingerprintOutputs();
    if (next !== lastFingerprint) {
      lastFingerprint = next;
      scheduleRestart("output-change");
    }
  }, outputPollMs);
}

function startOutputWatchers() {
  if (process.env.T3CODE_DESKTOP_OUTPUT_NATIVE_WATCH === "1") {
    startNativeOutputWatchers();
    return;
  }

  startPollingOutputWatch();
}

function killChildTree(signal) {
  if (process.platform === "win32") {
    return;
  }

  // Kill direct children as a final fallback in case normal shutdown leaves stragglers.
  spawnSync("pkill", [`-${signal}`, "-P", String(process.pid)], { stdio: "ignore" });
}

async function shutdown(exitCode) {
  if (shuttingDown) return;
  shuttingDown = true;

  if (restartTimer) {
    clearTimeout(restartTimer);
    restartTimer = null;
  }

  for (const watcher of watchers) {
    watcher.close();
  }

  if (outputPollTimer) {
    clearInterval(outputPollTimer);
    outputPollTimer = null;
  }

  await stopApp();
  killChildTree("TERM");
  await new Promise((resolve) => {
    setTimeout(resolve, childTreeGracePeriodMs);
  });
  killChildTree("KILL");

  process.exit(exitCode);
}

startOutputWatchers();
cleanupStaleDevApps();
startApp();

process.once("SIGINT", () => {
  void shutdown(130);
});
process.once("SIGTERM", () => {
  void shutdown(143);
});
process.once("SIGHUP", () => {
  void shutdown(129);
});
