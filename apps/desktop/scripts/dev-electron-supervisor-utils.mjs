import { readFileSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const DEV_ELECTRON_RELAUNCH_EXIT_CODE = 75;
export const DEV_ELECTRON_SINGLE_INSTANCE_LOCK_EXIT_CODE = 76;
export const DEV_BUILD_READY_SENTINEL_RELATIVE = "dist-electron/.dev-build-ready.json";
export const DEV_SUPERVISOR_LOCK_RELATIVE = "dist-electron/.dev-supervisor.lock";
export const DEFAULT_OUTPUT_STABLE_POLLS_REQUIRED = 2;
export const MAX_SINGLE_INSTANCE_LOCK_RETRIES = 3;
export const FAST_FAILURE_THRESHOLD_MS = 5_000;
export const MAX_CONSECUTIVE_FAST_FAILURES = 5;
export const MAX_ABNORMAL_EXIT_RESTARTS = 3;
export const MAX_SUPERVISOR_LIFETIME_RESTARTS = 5;

/**
 * @typedef {"noop" | "cleanup-and-retry" | "stop-supervisor" | "restart"} ElectronExitAction
 */

/**
 * @param {{ readonly kind: string; readonly current: number }} input
 */
export function nextAbnormalExitCount(input) {
  switch (input.kind) {
    case "abnormal-exit":
    case "spawn-error":
      return input.current + 1;
    case "output-change":
    case "dev-relaunch":
    case "expected-restart":
      return 0;
    default:
      return input.current;
  }
}

/**
 * @param {number} abnormalExitRestarts
 */
export function shouldStopAfterAbnormalExits(abnormalExitRestarts) {
  return abnormalExitRestarts >= MAX_ABNORMAL_EXIT_RESTARTS;
}

/**
 * @param {number} lifetimeRestartsUsed
 */
export function shouldStopAfterSupervisorLifetimeRestarts(lifetimeRestartsUsed) {
  return lifetimeRestartsUsed >= MAX_SUPERVISOR_LIFETIME_RESTARTS;
}

/**
 * @param {{ readonly elapsedMs: number; readonly currentCount: number }} input
 */
export function nextConsecutiveFastFailureCount(input) {
  if (input.elapsedMs >= FAST_FAILURE_THRESHOLD_MS) {
    return 0;
  }

  return input.currentCount + 1;
}

/**
 * @param {number} consecutiveFastFailures
 */
export function shouldStopAfterConsecutiveFastFailures(consecutiveFastFailures) {
  return consecutiveFastFailures >= MAX_CONSECUTIVE_FAST_FAILURES;
}

/**
 * @param {{ readonly kind: string; readonly code: number | null; readonly retriesUsed: number }} input
 */
export function shouldRetryAfterSingleInstanceLockDenied(input) {
  if (input.code === DEV_ELECTRON_SINGLE_INSTANCE_LOCK_EXIT_CODE) {
    return input.retriesUsed < MAX_SINGLE_INSTANCE_LOCK_RETRIES;
  }

  if (input.kind !== "single-instance-lock-denied") {
    return false;
  }

  if (input.code !== DEV_ELECTRON_SINGLE_INSTANCE_LOCK_EXIT_CODE) {
    return false;
  }

  return input.retriesUsed < MAX_SINGLE_INSTANCE_LOCK_RETRIES;
}

/**
 * @param {{
 *   readonly shuttingDown: boolean;
 *   readonly expected: boolean;
 *   readonly code: number | null;
 *   readonly signal: NodeJS.Signals | null;
 *   readonly singleInstanceLockRetriesUsed: number;
 *   readonly consecutiveFastFailures: number;
 *   readonly abnormalExitRestartsUsed: number;
 *   readonly autoRestartEnabled: boolean;
 *   readonly lifetimeRestartsUsed: number;
 * }} input
 */
export function decideElectronExitAction(input) {
  const classification = classifyElectronExit({
    shuttingDown: input.shuttingDown,
    expected: input.expected,
    code: input.code,
    signal: input.signal,
  });

  if (input.shuttingDown || input.expected) {
    return {
      action: /** @type {ElectronExitAction} */ ("noop"),
      classification,
      reason: classification.kind,
      supervisorExitCode: 0,
    };
  }

  const isExplicitLockDenied =
    input.code === DEV_ELECTRON_SINGLE_INSTANCE_LOCK_EXIT_CODE && input.signal === null;

  // Stale dev instances holding the single-instance lock are a startup hygiene issue,
  // not a crash loop — always clean up and retry, even when auto-restart is disabled.
  if (isExplicitLockDenied || classification.kind === "single-instance-lock-denied") {
    if (input.singleInstanceLockRetriesUsed < MAX_SINGLE_INSTANCE_LOCK_RETRIES) {
      return {
        action: /** @type {ElectronExitAction} */ ("cleanup-and-retry"),
        classification,
        reason: "single-instance-lock-denied",
        supervisorExitCode: 1,
      };
    }

    return {
      action: /** @type {ElectronExitAction} */ ("stop-supervisor"),
      classification,
      reason: "single-instance-lock-exhausted",
      supervisorExitCode: 1,
    };
  }

  if (!input.autoRestartEnabled) {
    return {
      action: /** @type {ElectronExitAction} */ ("stop-supervisor"),
      classification,
      reason: classification.kind,
      supervisorExitCode: classification.kind === "clean-exit" ? 0 : 1,
    };
  }

  if (shouldStopAfterSupervisorLifetimeRestarts(input.lifetimeRestartsUsed)) {
    return {
      action: /** @type {ElectronExitAction} */ ("stop-supervisor"),
      classification,
      reason: "supervisor-lifetime-restart-cap",
      supervisorExitCode: 1,
    };
  }

  if (classification.kind === "dev-relaunch") {
    return {
      action: /** @type {ElectronExitAction} */ ("restart"),
      classification,
      reason: classification.kind,
      supervisorExitCode: 0,
    };
  }

  if (shouldStopAfterAbnormalExits(input.abnormalExitRestartsUsed)) {
    return {
      action: /** @type {ElectronExitAction} */ ("stop-supervisor"),
      classification,
      reason: "abnormal-exit-cap",
      supervisorExitCode: 1,
    };
  }

  if (shouldStopAfterConsecutiveFastFailures(input.consecutiveFastFailures)) {
    return {
      action: /** @type {ElectronExitAction} */ ("stop-supervisor"),
      classification,
      reason: "rapid-failure-cap",
      supervisorExitCode: 1,
    };
  }

  if (classification.shouldRestart) {
    return {
      action: /** @type {ElectronExitAction} */ ("restart"),
      classification,
      reason: classification.kind,
      supervisorExitCode: 0,
    };
  }

  return {
    action: /** @type {ElectronExitAction} */ ("noop"),
    classification,
    reason: classification.kind,
    supervisorExitCode: classification.kind === "clean-exit" ? 0 : 1,
  };
}

/**
 * @param {unknown} value
 * @returns {value is { readonly writtenAtMs: number; readonly outputFingerprint: string }}
 */
export function parseDevBuildReadySentinel(value) {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const writtenAtMs = Reflect.get(value, "writtenAtMs");
  const outputFingerprint = Reflect.get(value, "outputFingerprint");
  return (
    typeof writtenAtMs === "number" &&
    Number.isFinite(writtenAtMs) &&
    typeof outputFingerprint === "string" &&
    outputFingerprint.length > 0
  );
}

/**
 * @param {{ readonly writtenAtMs: number }} sentinel
 * @param {number} minWrittenAtMs
 */
export function isDevBuildSentinelFresh(sentinel, minWrittenAtMs) {
  return sentinel.writtenAtMs >= minWrittenAtMs;
}

/**
 * @param {string} baseDir
 * @param {readonly { readonly directory: string; readonly files: ReadonlySet<string> }} watchedDirectories
 */
export function fingerprintWatchedOutputFiles(baseDir, watchedDirectories) {
  const parts = [];
  for (const { directory, files } of watchedDirectories) {
    const dirAbs = join(baseDir, directory);
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

export function fingerprintHasMissing(fingerprint) {
  return fingerprint.includes("\0missing");
}

/**
 * @param {{ readonly lastFingerprint: string; readonly stableCandidate: string | null; readonly stableCount: number }} state
 * @param {string} nextFingerprint
 * @param {number} [stablePollsRequired]
 */
export function evaluateOutputPollState(
  state,
  nextFingerprint,
  stablePollsRequired = DEFAULT_OUTPUT_STABLE_POLLS_REQUIRED,
) {
  if (fingerprintHasMissing(nextFingerprint)) {
    return {
      lastFingerprint: nextFingerprint,
      stableCandidate: null,
      stableCount: 0,
      shouldRestart: false,
    };
  }

  if (nextFingerprint !== state.lastFingerprint) {
    return {
      lastFingerprint: nextFingerprint,
      stableCandidate: nextFingerprint,
      stableCount: 1,
      shouldRestart: false,
    };
  }

  if (state.stableCandidate !== null && nextFingerprint === state.stableCandidate) {
    const stableCount = state.stableCount + 1;
    if (stableCount >= stablePollsRequired) {
      return {
        lastFingerprint: nextFingerprint,
        stableCandidate: null,
        stableCount: 0,
        shouldRestart: true,
      };
    }

    return {
      lastFingerprint: state.lastFingerprint,
      stableCandidate: state.stableCandidate,
      stableCount,
      shouldRestart: false,
    };
  }

  return {
    lastFingerprint: state.lastFingerprint,
    stableCandidate: state.stableCandidate,
    stableCount: state.stableCount,
    shouldRestart: false,
  };
}

/**
 * @param {{ readonly shuttingDown: boolean; readonly expected: boolean; readonly code: number | null; readonly signal: NodeJS.Signals | null }} input
 */
export function classifyElectronExit(input) {
  const isIntentionalDevRelaunch = input.code === DEV_ELECTRON_RELAUNCH_EXIT_CODE;
  const isSingleInstanceLockDenied =
    input.code === DEV_ELECTRON_SINGLE_INSTANCE_LOCK_EXIT_CODE && input.signal === null;
  const exitedAbnormally =
    input.signal !== null ||
    (input.code !== 0 &&
      input.code !== null &&
      !isIntentionalDevRelaunch &&
      !isSingleInstanceLockDenied);

  let kind = "clean-exit";
  if (input.shuttingDown) {
    kind = "shutdown";
  } else if (input.expected) {
    kind = "expected-restart";
  } else if (isIntentionalDevRelaunch) {
    kind = "dev-relaunch";
  } else if (isSingleInstanceLockDenied) {
    kind = "single-instance-lock-denied";
  } else if (exitedAbnormally) {
    kind = "abnormal-exit";
  }

  const shouldRestart =
    !input.shuttingDown && !input.expected && (isIntentionalDevRelaunch || exitedAbnormally);

  return {
    kind,
    shouldRestart,
    expectedRestart: input.expected,
    isIntentionalDevRelaunch,
  };
}

/**
 * @param {number | undefined} pid
 */
export function isPidAlive(pid) {
  if (typeof pid !== "number" || pid <= 0) {
    return false;
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
    return code !== "ESRCH";
  }
}

/**
 * @typedef {{ readonly pid: number; readonly startedAtMs: number }} SupervisorLockRecord
 */

/**
 * Parse the JSON contents of a supervisor lockfile.
 * @param {string} raw
 * @returns {SupervisorLockRecord | null}
 */
export function parseSupervisorLockFile(raw) {
  let value;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const pid = Reflect.get(value, "pid");
  const startedAtMs = Reflect.get(value, "startedAtMs");
  if (typeof pid !== "number" || !Number.isInteger(pid) || pid <= 0) {
    return null;
  }
  if (typeof startedAtMs !== "number" || !Number.isFinite(startedAtMs)) {
    return null;
  }
  return { pid, startedAtMs };
}

/**
 * Attempt to acquire the supervisor lockfile for the given absolute path.
 * Atomically writes our PID using the "wx" flag. If the lockfile already exists
 * and references a live PID, returns { acquired: false } with holder info; if
 * the holder is dead (stale), clears the lockfile and retries once.
 *
 * @param {string} absoluteLockPath
 * @param {{ readonly pid?: number; readonly now?: () => number; readonly isAlive?: (pid: number) => boolean }} [options]
 * @returns {{ acquired: true } | { acquired: false; holder: SupervisorLockRecord }}
 */
export function acquireSupervisorLock(absoluteLockPath, options = {}) {
  const ownPid = options.pid ?? process.pid;
  const now = options.now ?? (() => Date.now());
  const isAlive = options.isAlive ?? isPidAlive;

  const tryWrite = () => {
    const record = { pid: ownPid, startedAtMs: now() };
    writeFileSync(absoluteLockPath, `${JSON.stringify(record)}\n`, { flag: "wx" });
    return record;
  };

  try {
    tryWrite();
    return { acquired: true };
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
    if (code !== "EEXIST") {
      throw error;
    }
  }

  let existing;
  try {
    existing = parseSupervisorLockFile(readFileSync(absoluteLockPath, "utf8"));
  } catch {
    existing = null;
  }

  if (existing && isAlive(existing.pid) && existing.pid !== ownPid) {
    return { acquired: false, holder: existing };
  }

  // Stale lockfile (corrupt, our own PID, or holder dead) — best-effort clear and retry once.
  try {
    unlinkSync(absoluteLockPath);
  } catch {
    // ignore: another process may have cleared it concurrently
  }

  try {
    tryWrite();
    return { acquired: true };
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
    if (code === "EEXIST") {
      let holder;
      try {
        holder = parseSupervisorLockFile(readFileSync(absoluteLockPath, "utf8"));
      } catch {
        holder = null;
      }
      return {
        acquired: false,
        holder: holder ?? { pid: 0, startedAtMs: now() },
      };
    }
    throw error;
  }
}

/**
 * Best-effort release of the supervisor lockfile. Only removes the file if it
 * still references our PID, so a stale-takeover by another supervisor doesn't
 * cause us to delete its lock.
 *
 * @param {string} absoluteLockPath
 * @param {{ readonly pid?: number }} [options]
 */
export function releaseSupervisorLock(absoluteLockPath, options = {}) {
  const ownPid = options.pid ?? process.pid;
  try {
    const raw = readFileSync(absoluteLockPath, "utf8");
    const record = parseSupervisorLockFile(raw);
    if (record && record.pid !== ownPid) {
      return;
    }
  } catch {
    // No lockfile present or unreadable — nothing to do.
    return;
  }
  try {
    unlinkSync(absoluteLockPath);
  } catch {
    // ignore
  }
}

/**
 * True when the supervisor has been re-parented to init/launchd (PPID 1),
 * which happens when the parent shell exits without forwarding SIGHUP.
 *
 * @param {number} ppid
 */
export function isOrphanedToInit(ppid) {
  return ppid === 1;
}
