import { spawn, spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { watch } from "node:fs";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

import { desktopDir, getElectronLaunchInfo, resolveElectronPath } from "./electron-launcher.mjs";
import {
  cleanupStaleDesktopDevProcesses,
  ensureNoLiveDesktopDevRootProcesses,
} from "./cleanup-stale-desktop-dev.mjs";
import {
  acquireSupervisorLock,
  classifyElectronExit,
  decideElectronExitAction,
  DEV_BUILD_READY_SENTINEL_RELATIVE,
  DEV_SUPERVISOR_LOCK_RELATIVE,
  evaluateOutputPollState,
  fingerprintWatchedOutputFiles,
  isDevBuildSentinelFresh,
  isOrphanedToInit,
  isPidAlive,
  MAX_SUPERVISOR_LIFETIME_RESTARTS,
  nextAbnormalExitCount,
  nextConsecutiveFastFailureCount,
  parseDevBuildReadySentinel,
  releaseSupervisorLock,
  shouldStopAfterAbnormalExits,
  shouldStopAfterSupervisorLifetimeRestarts,
} from "./dev-electron-supervisor-utils.mjs";
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
const forcedShutdownTimeoutMs = 5_000;
const pidExitPollMs = 50;
const restartDebounceMs = 120;
const minRestartCooldownMs = 2_000;
const earlySessionOutputRestartGuardMsRaw =
  process.env.T3CODE_DESKTOP_EARLY_SESSION_RESTART_GUARD_MS;
const earlySessionOutputRestartGuardMs =
  Number.isFinite(Number(earlySessionOutputRestartGuardMsRaw)) &&
  Number(earlySessionOutputRestartGuardMsRaw) > 0
    ? Number(earlySessionOutputRestartGuardMsRaw)
    : 60_000;
const childTreeGracePeriodMs = 1_200;
const outputPollMsRaw = process.env.T3CODE_DESKTOP_OUTPUT_POLL_MS;
const outputPollMs =
  Number.isFinite(Number(outputPollMsRaw)) && Number(outputPollMsRaw) > 0
    ? Number(outputPollMsRaw)
    : 400;
const devBuildSentinelPollMsRaw = process.env.T3CODE_DESKTOP_DEV_BUILD_SENTINEL_POLL_MS;
const devBuildSentinelPollMs =
  Number.isFinite(Number(devBuildSentinelPollMsRaw)) && Number(devBuildSentinelPollMsRaw) > 0
    ? Number(devBuildSentinelPollMsRaw)
    : 100;
const devBuildSentinelTimeoutMsRaw = process.env.T3CODE_DESKTOP_DEV_BUILD_SENTINEL_TIMEOUT_MS;
const devBuildSentinelTimeoutMs =
  Number.isFinite(Number(devBuildSentinelTimeoutMsRaw)) && Number(devBuildSentinelTimeoutMsRaw) > 0
    ? Number(devBuildSentinelTimeoutMsRaw)
    : 120_000;
const autoRestartEnabled = process.env.T3CODE_DESKTOP_DEV_AUTO_RESTART === "1";

const supervisorStartedAtMs = Date.now();

const supervisorLockPath = join(desktopDir, DEV_SUPERVISOR_LOCK_RELATIVE);
const lockResult = acquireSupervisorLock(supervisorLockPath);
if (!lockResult.acquired) {
  console.error(
    `[dev-electron] another dev supervisor is already running for ${desktopDir} (pid=${lockResult.holder.pid}). ` +
      `Stop it before starting a new one, or run: kill ${lockResult.holder.pid}`,
  );
  process.exit(1);
}

const supervisorStartingPpid = process.ppid;
const ppidWatchdogTimer = setInterval(() => {
  const currentPpid = process.ppid;
  if (currentPpid !== supervisorStartingPpid && isOrphanedToInit(currentPpid)) {
    console.info(
      "[dev-electron] parent shell exited (re-parented to init); shutting down supervisor",
    );
    void shutdown(0);
  }
}, 2_000);
ppidWatchdogTimer.unref();

await waitForResources({
  baseDir: desktopDir,
  files: requiredFiles,
  tcpHost: devServer.hostname,
  tcpPort: port,
});

const freshDevBuildSentinel = await waitForFreshDevBuildSentinel({
  minWrittenAtMs: supervisorStartedAtMs,
});
logDevElectron("fresh dev bundle ready", {
  writtenAtMs: freshDevBuildSentinel.writtenAtMs,
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
let startInFlight = false;
let restartQueue = Promise.resolve();
const expectedExits = new WeakSet();
const watchers = [];
let outputPollTimer = null;
let lastAppStartAtMs = 0;
let restartGeneration = 0;
let singleInstanceLockRetries = 0;
let consecutiveFastFailures = 0;
let abnormalExitRestarts = 0;
let supervisorLifetimeRestarts = 0;
let outputPollState = {
  lastFingerprint: "",
  stableCandidate: null,
  stableCount: 0,
};

function logDevElectron(message, data = {}) {
  console.info(`[dev-electron] ${message}`, data);
}

function logElectronCrashDiagnostic({ generation, kind, code, signal, elapsedMs, message }) {
  logDevElectron(message, {
    generation,
    kind,
    code,
    signal,
    elapsedMs,
  });

  if (!autoRestartEnabled && (kind === "abnormal-exit" || kind === "spawn-error")) {
    logDevElectron(
      "electron crashed — supervisor will not auto-restart (set T3CODE_DESKTOP_DEV_AUTO_RESTART=1 to enable)",
      { generation, code, signal, elapsedMs },
    );
  }

  if (kind === "single-instance-lock-denied") {
    logDevElectron("another desktop dev instance holds the single-instance lock", {
      generation,
      code,
      elapsedMs,
      recoveryHint: `pkill -f -- --t3code-dev-root=${desktopDir}`,
    });
  }
}

async function waitForFreshDevBuildSentinel({ minWrittenAtMs }) {
  const sentinelPath = join(desktopDir, DEV_BUILD_READY_SENTINEL_RELATIVE);
  const startedAt = Date.now();

  while (true) {
    try {
      const raw = await readFile(sentinelPath, "utf8");
      const parsed = JSON.parse(raw);
      if (parseDevBuildReadySentinel(parsed) && isDevBuildSentinelFresh(parsed, minWrittenAtMs)) {
        return parsed;
      }
    } catch {
      // Keep polling until a fresh sentinel appears.
    }

    if (Date.now() - startedAt >= devBuildSentinelTimeoutMs) {
      throw new Error(
        `Timed out waiting for fresh desktop dev bundle sentinel after ${devBuildSentinelTimeoutMs}ms (${DEV_BUILD_READY_SENTINEL_RELATIVE})`,
      );
    }

    await delay(devBuildSentinelPollMs);
  }
}

function resetOutputWatchBaseline() {
  outputPollState = {
    lastFingerprint: fingerprintOutputs(),
    stableCandidate: null,
    stableCount: 0,
  };
}

function killChildTreeByPid(pid, signal) {
  if (process.platform === "win32" || typeof pid !== "number") {
    return;
  }

  spawnSync("pkill", [`-${signal}`, "-P", String(pid)], { stdio: "ignore" });
}

async function waitForPidExit(pid, timeoutMs) {
  if (typeof pid !== "number" || pid <= 0) {
    return true;
  }

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!isPidAlive(pid)) {
      return true;
    }
    await delay(pidExitPollMs);
  }

  return !isPidAlive(pid);
}

function cleanupStaleDevApps() {
  cleanupStaleDesktopDevProcesses(desktopDir);
  logDevElectron("cleaned stale desktop dev processes");
}

function startApp() {
  if (shuttingDown || currentApp !== null || startInFlight) {
    return;
  }

  startInFlight = true;
  void (async () => {
    try {
      await ensureNoLiveDesktopDevRootProcesses(desktopDir, childTreeGracePeriodMs);
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
      resetOutputWatchBaseline();

      app.once("error", (error) => {
        if (currentApp === app) {
          currentApp = null;
        }

        const elapsedMs = Date.now() - lastAppStartAtMs;
        const message = error instanceof Error ? error.message : String(error);

        if (!autoRestartEnabled) {
          logElectronCrashDiagnostic({
            generation,
            kind: "spawn-error",
            code: null,
            signal: null,
            elapsedMs,
            message: "electron spawn error",
          });
          if (!shuttingDown) {
            void shutdown(1);
          }
          return;
        }

        logDevElectron("electron spawn error (will restart)", {
          generation,
          message,
        });

        if (!shuttingDown) {
          abnormalExitRestarts = nextAbnormalExitCount({
            kind: "spawn-error",
            current: abnormalExitRestarts,
          });
          if (shouldStopAfterAbnormalExits(abnormalExitRestarts)) {
            logDevElectron("stopping dev-electron supervisor to prevent restart loop", {
              generation,
              reason: "abnormal-exit-cap",
              abnormalExitRestarts,
            });
            cleanupStaleDevApps();
            void shutdown(1);
            return;
          }
          scheduleRestart("spawn-error");
        }
      });

      app.once("exit", (code, signal) => {
        if (currentApp === app) {
          currentApp = null;
        }

        const expected = expectedExits.has(app);
        const classification = classifyElectronExit({
          shuttingDown,
          expected,
          code,
          signal,
        });

        const elapsedMs = Date.now() - lastAppStartAtMs;
        consecutiveFastFailures = nextConsecutiveFastFailureCount({
          elapsedMs,
          currentCount: consecutiveFastFailures,
        });
        abnormalExitRestarts = nextAbnormalExitCount({
          kind: classification.kind,
          current: abnormalExitRestarts,
        });

        logDevElectron("electron exited", {
          generation,
          kind: classification.kind,
          code,
          signal,
          elapsedMs,
          expectedRestart: classification.expectedRestart,
        });

        const exitDecision = decideElectronExitAction({
          shuttingDown,
          expected,
          code,
          signal,
          singleInstanceLockRetriesUsed: singleInstanceLockRetries,
          consecutiveFastFailures,
          abnormalExitRestartsUsed: abnormalExitRestarts,
          autoRestartEnabled,
          lifetimeRestartsUsed: supervisorLifetimeRestarts,
        });

        switch (exitDecision.action) {
          case "cleanup-and-retry":
            singleInstanceLockRetries += 1;
            logDevElectron(
              "electron denied single-instance lock — cleaning stale dev apps and retrying",
              {
                generation,
                elapsedMs,
                retryAttempt: singleInstanceLockRetries,
                code,
                signal,
                reason: exitDecision.reason,
              },
            );
            cleanupStaleDevApps();
            restartQueue = restartQueue
              .catch(() => undefined)
              .then(async () => {
                await ensureNoLiveDesktopDevRootProcesses(desktopDir, childTreeGracePeriodMs * 2);
                if (!shuttingDown && currentApp === null) {
                  startApp();
                }
              });
            return;
          case "stop-supervisor":
            if (
              !autoRestartEnabled ||
              classification.kind === "abnormal-exit" ||
              classification.kind === "spawn-error" ||
              classification.kind === "single-instance-lock-denied"
            ) {
              logElectronCrashDiagnostic({
                generation,
                kind: classification.kind,
                code,
                signal,
                elapsedMs,
                message: "electron exit — stopping supervisor",
              });
            } else {
              logDevElectron("stopping dev-electron supervisor", {
                generation,
                elapsedMs,
                code,
                signal,
                reason: exitDecision.reason,
                singleInstanceLockRetries,
                consecutiveFastFailures,
                abnormalExitRestarts,
              });
            }
            if (autoRestartEnabled) {
              cleanupStaleDevApps();
            }
            void shutdown(exitDecision.supervisorExitCode);
            return;
          case "restart":
            scheduleRestart(exitDecision.reason);
            return;
          case "noop":
          default:
            return;
        }
      });
    } finally {
      startInFlight = false;
    }
  })();
}

async function stopApp() {
  const app = currentApp;
  if (!app) {
    return;
  }

  const trackedPid = app.pid;
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
    killChildTreeByPid(trackedPid, "TERM");

    setTimeout(() => {
      if (settled) {
        return;
      }

      app.kill("SIGKILL");
      killChildTreeByPid(trackedPid, "KILL");
    }, forcedShutdownTimeoutMs).unref();
  });

  const exited = await waitForPidExit(trackedPid, forcedShutdownTimeoutMs);
  if (!exited && typeof trackedPid === "number") {
    logDevElectron("electron child still alive after forced shutdown", {
      pid: trackedPid,
    });
    killChildTreeByPid(trackedPid, "KILL");
    await waitForPidExit(trackedPid, forcedShutdownTimeoutMs);
  }
}

function scheduleRestart(reason) {
  if (shuttingDown) {
    return;
  }

  if (shouldStopAfterSupervisorLifetimeRestarts(supervisorLifetimeRestarts)) {
    logDevElectron("stopping dev-electron supervisor to prevent restart loop", {
      reason: "supervisor-lifetime-restart-cap",
      supervisorLifetimeRestarts,
      maxSupervisorLifetimeRestarts: MAX_SUPERVISOR_LIFETIME_RESTARTS,
    });
    cleanupStaleDevApps();
    void shutdown(1);
    return;
  }

  supervisorLifetimeRestarts += 1;

  if (reason === "output-change" || reason === "dev-relaunch" || reason === "expected-restart") {
    abnormalExitRestarts = nextAbnormalExitCount({ kind: reason, current: abnormalExitRestarts });
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
    abnormalExitRestarts,
  });

  restartTimer = setTimeout(() => {
    restartTimer = null;
    restartQueue = restartQueue
      .catch(() => undefined)
      .then(async () => {
        await stopApp();
        if (!shuttingDown && currentApp === null) {
          startApp();
        }
      });
  }, delayMs);
}

function fingerprintOutputs() {
  return fingerprintWatchedOutputFiles(desktopDir, watchedDirectories);
}

function handleOutputFingerprint(nextFingerprint) {
  if (currentApp !== null) {
    const elapsedSinceStart = Date.now() - lastAppStartAtMs;
    if (elapsedSinceStart < minRestartCooldownMs) {
      outputPollState = {
        lastFingerprint: nextFingerprint,
        stableCandidate: null,
        stableCount: 0,
      };
      return;
    }
    if (autoRestartEnabled && elapsedSinceStart < earlySessionOutputRestartGuardMs) {
      logDevElectron("deferring output-change restart during early session guard", {
        elapsedSinceStart,
        guardMs: earlySessionOutputRestartGuardMs,
      });
      outputPollState = {
        lastFingerprint: nextFingerprint,
        stableCandidate: null,
        stableCount: 0,
      };
      return;
    }
  }

  outputPollState = evaluateOutputPollState(outputPollState, nextFingerprint);
  if (outputPollState.shouldRestart) {
    if (autoRestartEnabled) {
      scheduleRestart("output-change");
      return;
    }

    logDevElectron("main.cjs changed; restart manually", {
      fingerprint: nextFingerprint,
    });
    outputPollState = {
      lastFingerprint: nextFingerprint,
      stableCandidate: null,
      stableCount: 0,
    };
  }
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

        handleOutputFingerprint(fingerprintOutputs());
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
  resetOutputWatchBaseline();

  outputPollTimer = setInterval(() => {
    if (shuttingDown) {
      return;
    }

    handleOutputFingerprint(fingerprintOutputs());
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

  clearInterval(ppidWatchdogTimer);

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

  releaseSupervisorLock(supervisorLockPath);

  process.exit(exitCode);
}

startOutputWatchers();
cleanupStaleDevApps();
if (autoRestartEnabled) {
  logDevElectron("auto-restart enabled", {
    earlySessionOutputRestartGuardMs,
  });
} else {
  logDevElectron(
    "auto-restart disabled; electron launches once (set T3CODE_DESKTOP_DEV_AUTO_RESTART=1 to enable)",
    { T3CODE_DESKTOP_DEV_AUTO_RESTART: process.env.T3CODE_DESKTOP_DEV_AUTO_RESTART ?? "unset" },
  );
}
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
// Belt-and-suspenders synchronous release in case the process exits via
// uncaughtException or a path that bypasses shutdown().
process.on("exit", () => {
  releaseSupervisorLock(supervisorLockPath);
});
