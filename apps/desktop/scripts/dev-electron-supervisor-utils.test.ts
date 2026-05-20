import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  acquireSupervisorLock,
  classifyElectronExit,
  decideElectronExitAction,
  DEV_BUILD_READY_SENTINEL_RELATIVE,
  DEV_ELECTRON_RELAUNCH_EXIT_CODE,
  DEV_ELECTRON_SINGLE_INSTANCE_LOCK_EXIT_CODE,
  DEV_SUPERVISOR_LOCK_RELATIVE,
  evaluateOutputPollState,
  FAST_FAILURE_THRESHOLD_MS,
  fingerprintHasMissing,
  fingerprintWatchedOutputFiles,
  isDevBuildSentinelFresh,
  isOrphanedToInit,
  MAX_ABNORMAL_EXIT_RESTARTS,
  MAX_CONSECUTIVE_FAST_FAILURES,
  MAX_SINGLE_INSTANCE_LOCK_RETRIES,
  MAX_SUPERVISOR_LIFETIME_RESTARTS,
  nextAbnormalExitCount,
  nextConsecutiveFastFailureCount,
  parseDevBuildReadySentinel,
  parseSupervisorLockFile,
  releaseSupervisorLock,
  shouldRetryAfterSingleInstanceLockDenied,
  shouldStopAfterAbnormalExits,
  shouldStopAfterConsecutiveFastFailures,
  shouldStopAfterSupervisorLifetimeRestarts,
} from "./dev-electron-supervisor-utils.mjs";

describe("dev-electron-supervisor-utils", () => {
  it("detects missing output fingerprints", () => {
    expect(fingerprintHasMissing("dist-electron/main.cjs\0missing")).toBe(true);
    expect(fingerprintHasMissing("dist-electron/main.cjs\\0123\\0456")).toBe(false);
  });

  it("waits for stable output before scheduling restart", () => {
    const initial = {
      lastFingerprint: "a",
      stableCandidate: null,
      stableCount: 0,
    };

    const changed = evaluateOutputPollState(initial, "b");
    expect(changed.shouldRestart).toBe(false);
    expect(changed.stableCandidate).toBe("b");

    const ready = evaluateOutputPollState(changed, "b");
    expect(ready.shouldRestart).toBe(true);
  });

  it("ignores transient missing outputs during rebuild", () => {
    const state = {
      lastFingerprint: "ready",
      stableCandidate: null,
      stableCount: 0,
    };

    const missing = evaluateOutputPollState(state, "dist-electron/main.cjs\0missing");
    expect(missing.shouldRestart).toBe(false);
    expect(missing.stableCandidate).toBeNull();
  });

  it("treats dev relaunch exit code as intentional", () => {
    const classification = classifyElectronExit({
      shuttingDown: false,
      expected: false,
      code: DEV_ELECTRON_RELAUNCH_EXIT_CODE,
      signal: null,
    });

    expect(classification.kind).toBe("dev-relaunch");
    expect(classification.shouldRestart).toBe(true);
  });

  it("classifies explicit single-instance lock denial", () => {
    const classification = classifyElectronExit({
      shuttingDown: false,
      expected: false,
      code: DEV_ELECTRON_SINGLE_INSTANCE_LOCK_EXIT_CODE,
      signal: null,
    });

    expect(classification.kind).toBe("single-instance-lock-denied");
    expect(classification.shouldRestart).toBe(false);
  });

  it("does not restart on expected supervisor shutdown", () => {
    const classification = classifyElectronExit({
      shuttingDown: false,
      expected: true,
      code: 0,
      signal: null,
    });

    expect(classification.kind).toBe("expected-restart");
    expect(classification.shouldRestart).toBe(false);
  });

  it("retries only after explicit single-instance lock denial", () => {
    expect(
      shouldRetryAfterSingleInstanceLockDenied({
        kind: "single-instance-lock-denied",
        code: DEV_ELECTRON_SINGLE_INSTANCE_LOCK_EXIT_CODE,
        retriesUsed: 0,
      }),
    ).toBe(true);

    expect(
      shouldRetryAfterSingleInstanceLockDenied({
        kind: "abnormal-exit",
        code: DEV_ELECTRON_SINGLE_INSTANCE_LOCK_EXIT_CODE,
        retriesUsed: 0,
      }),
    ).toBe(true);

    expect(
      shouldRetryAfterSingleInstanceLockDenied({
        kind: "single-instance-lock-denied",
        code: DEV_ELECTRON_SINGLE_INSTANCE_LOCK_EXIT_CODE,
        retriesUsed: MAX_SINGLE_INSTANCE_LOCK_RETRIES,
      }),
    ).toBe(false);

    expect(
      shouldRetryAfterSingleInstanceLockDenied({
        kind: "clean-exit",
        code: 0,
        retriesUsed: 0,
      }),
    ).toBe(false);

    expect(
      shouldRetryAfterSingleInstanceLockDenied({
        kind: "single-instance-lock-denied",
        code: 0,
        retriesUsed: 0,
      }),
    ).toBe(false);
  });

  it("decides cleanup-and-retry once for lock-denied exits, then stops", () => {
    const first = decideElectronExitAction({
      shuttingDown: false,
      expected: false,
      code: DEV_ELECTRON_SINGLE_INSTANCE_LOCK_EXIT_CODE,
      signal: null,
      singleInstanceLockRetriesUsed: 0,
      consecutiveFastFailures: 0,
      abnormalExitRestartsUsed: 0,
      autoRestartEnabled: true,
      lifetimeRestartsUsed: 0,
    });
    expect(first.action).toBe("cleanup-and-retry");
    expect(first.classification.kind).toBe("single-instance-lock-denied");

    const second = decideElectronExitAction({
      shuttingDown: false,
      expected: false,
      code: DEV_ELECTRON_SINGLE_INSTANCE_LOCK_EXIT_CODE,
      signal: null,
      singleInstanceLockRetriesUsed: MAX_SINGLE_INSTANCE_LOCK_RETRIES,
      consecutiveFastFailures: 0,
      abnormalExitRestartsUsed: 0,
      autoRestartEnabled: true,
      lifetimeRestartsUsed: 0,
    });
    expect(second.action).toBe("stop-supervisor");
    expect(second.reason).toBe("single-instance-lock-exhausted");
  });

  it("never restarts on explicit lock-denied code even if kind regresses", () => {
    const decision = decideElectronExitAction({
      shuttingDown: false,
      expected: false,
      code: DEV_ELECTRON_SINGLE_INSTANCE_LOCK_EXIT_CODE,
      signal: null,
      singleInstanceLockRetriesUsed: MAX_SINGLE_INSTANCE_LOCK_RETRIES,
      consecutiveFastFailures: 0,
      abnormalExitRestartsUsed: 0,
      autoRestartEnabled: true,
      lifetimeRestartsUsed: 0,
    });

    expect(decision.action).toBe("stop-supervisor");
    expect(decision.action).not.toBe("restart");
  });

  it("stops the supervisor by default without auto-restart", () => {
    const abnormal = decideElectronExitAction({
      shuttingDown: false,
      expected: false,
      code: 1,
      signal: null,
      singleInstanceLockRetriesUsed: 0,
      consecutiveFastFailures: 0,
      abnormalExitRestartsUsed: 0,
      autoRestartEnabled: false,
      lifetimeRestartsUsed: 0,
    });
    expect(abnormal.action).toBe("stop-supervisor");
    expect(abnormal.reason).toBe("abnormal-exit");
    expect(abnormal.supervisorExitCode).toBe(1);

    const lockDenied = decideElectronExitAction({
      shuttingDown: false,
      expected: false,
      code: DEV_ELECTRON_SINGLE_INSTANCE_LOCK_EXIT_CODE,
      signal: null,
      singleInstanceLockRetriesUsed: 0,
      consecutiveFastFailures: 0,
      abnormalExitRestartsUsed: 0,
      autoRestartEnabled: false,
      lifetimeRestartsUsed: 0,
    });
    expect(lockDenied.action).toBe("cleanup-and-retry");
    expect(lockDenied.reason).toBe("single-instance-lock-denied");

    const clean = decideElectronExitAction({
      shuttingDown: false,
      expected: false,
      code: 0,
      signal: null,
      singleInstanceLockRetriesUsed: 0,
      consecutiveFastFailures: 0,
      abnormalExitRestartsUsed: 0,
      autoRestartEnabled: false,
      lifetimeRestartsUsed: 0,
    });
    expect(clean.action).toBe("stop-supervisor");
    expect(clean.reason).toBe("clean-exit");
    expect(clean.supervisorExitCode).toBe(0);

    const relaunch = decideElectronExitAction({
      shuttingDown: false,
      expected: false,
      code: DEV_ELECTRON_RELAUNCH_EXIT_CODE,
      signal: null,
      singleInstanceLockRetriesUsed: 0,
      consecutiveFastFailures: 0,
      abnormalExitRestartsUsed: 0,
      autoRestartEnabled: false,
      lifetimeRestartsUsed: 0,
    });
    expect(relaunch.action).toBe("stop-supervisor");
    expect(relaunch.classification.kind).toBe("dev-relaunch");

    const shutdown = decideElectronExitAction({
      shuttingDown: true,
      expected: false,
      code: 1,
      signal: null,
      singleInstanceLockRetriesUsed: 0,
      consecutiveFastFailures: 0,
      abnormalExitRestartsUsed: 0,
      autoRestartEnabled: false,
      lifetimeRestartsUsed: 0,
    });
    expect(shutdown.action).toBe("noop");
    expect(shutdown.reason).toBe("shutdown");
  });

  it("still restarts on ordinary abnormal exits", () => {
    const decision = decideElectronExitAction({
      shuttingDown: false,
      expected: false,
      code: 1,
      signal: null,
      singleInstanceLockRetriesUsed: 0,
      consecutiveFastFailures: 0,
      abnormalExitRestartsUsed: 0,
      autoRestartEnabled: true,
      lifetimeRestartsUsed: 0,
    });

    expect(decision.action).toBe("restart");
    expect(decision.classification.kind).toBe("abnormal-exit");
  });

  it("stops the supervisor after consecutive fast failures", () => {
    expect(
      nextConsecutiveFastFailureCount({
        elapsedMs: FAST_FAILURE_THRESHOLD_MS - 1,
        currentCount: MAX_CONSECUTIVE_FAST_FAILURES - 1,
      }),
    ).toBe(MAX_CONSECUTIVE_FAST_FAILURES);

    expect(shouldStopAfterConsecutiveFastFailures(MAX_CONSECUTIVE_FAST_FAILURES)).toBe(true);

    const decision = decideElectronExitAction({
      shuttingDown: false,
      expected: false,
      code: 1,
      signal: null,
      singleInstanceLockRetriesUsed: 0,
      consecutiveFastFailures: MAX_CONSECUTIVE_FAST_FAILURES,
      abnormalExitRestartsUsed: 0,
      autoRestartEnabled: true,
      lifetimeRestartsUsed: 0,
    });
    expect(decision.action).toBe("stop-supervisor");
    expect(decision.reason).toBe("rapid-failure-cap");
  });

  it("resets consecutive fast failures after a longer-lived run", () => {
    expect(
      nextConsecutiveFastFailureCount({
        elapsedMs: FAST_FAILURE_THRESHOLD_MS,
        currentCount: 4,
      }),
    ).toBe(0);
  });

  it("tracks abnormal exit budget and resets on intentional restarts", () => {
    expect(nextAbnormalExitCount({ kind: "abnormal-exit", current: 0 })).toBe(1);
    expect(nextAbnormalExitCount({ kind: "spawn-error", current: 1 })).toBe(2);
    expect(nextAbnormalExitCount({ kind: "output-change", current: 2 })).toBe(0);
    expect(nextAbnormalExitCount({ kind: "dev-relaunch", current: 3 })).toBe(0);
    expect(nextAbnormalExitCount({ kind: "expected-restart", current: 2 })).toBe(0);
    expect(nextAbnormalExitCount({ kind: "clean-exit", current: 2 })).toBe(2);
  });

  it("stops the supervisor after the abnormal exit budget is exhausted", () => {
    expect(shouldStopAfterAbnormalExits(MAX_ABNORMAL_EXIT_RESTARTS)).toBe(true);

    const decision = decideElectronExitAction({
      shuttingDown: false,
      expected: false,
      code: 1,
      signal: null,
      singleInstanceLockRetriesUsed: 0,
      consecutiveFastFailures: 0,
      abnormalExitRestartsUsed: MAX_ABNORMAL_EXIT_RESTARTS,
      autoRestartEnabled: true,
      lifetimeRestartsUsed: 0,
    });
    expect(decision.action).toBe("stop-supervisor");
    expect(decision.reason).toBe("abnormal-exit-cap");
  });

  it("allows restart after output-change resets the abnormal exit budget", () => {
    let abnormalCount = 0;
    abnormalCount = nextAbnormalExitCount({ kind: "abnormal-exit", current: abnormalCount });
    abnormalCount = nextAbnormalExitCount({ kind: "abnormal-exit", current: abnormalCount });
    expect(abnormalCount).toBe(2);

    abnormalCount = nextAbnormalExitCount({ kind: "output-change", current: abnormalCount });
    expect(abnormalCount).toBe(0);

    abnormalCount = nextAbnormalExitCount({ kind: "abnormal-exit", current: abnormalCount });
    abnormalCount = nextAbnormalExitCount({ kind: "abnormal-exit", current: abnormalCount });
    expect(abnormalCount).toBe(2);

    const decision = decideElectronExitAction({
      shuttingDown: false,
      expected: false,
      code: 1,
      signal: null,
      singleInstanceLockRetriesUsed: 0,
      consecutiveFastFailures: 0,
      abnormalExitRestartsUsed: abnormalCount,
      autoRestartEnabled: true,
      lifetimeRestartsUsed: 0,
    });
    expect(decision.action).toBe("restart");
  });

  it("always restarts on dev relaunch regardless of abnormal exit budget", () => {
    const decision = decideElectronExitAction({
      shuttingDown: false,
      expected: false,
      code: DEV_ELECTRON_RELAUNCH_EXIT_CODE,
      signal: null,
      singleInstanceLockRetriesUsed: 0,
      consecutiveFastFailures: 0,
      abnormalExitRestartsUsed: MAX_ABNORMAL_EXIT_RESTARTS,
      autoRestartEnabled: true,
      lifetimeRestartsUsed: 0,
    });
    expect(decision.action).toBe("restart");
    expect(decision.classification.kind).toBe("dev-relaunch");
  });

  it("stops the supervisor after the global lifetime restart cap", () => {
    expect(shouldStopAfterSupervisorLifetimeRestarts(MAX_SUPERVISOR_LIFETIME_RESTARTS)).toBe(true);

    const decision = decideElectronExitAction({
      shuttingDown: false,
      expected: false,
      code: 1,
      signal: null,
      singleInstanceLockRetriesUsed: 0,
      consecutiveFastFailures: 0,
      abnormalExitRestartsUsed: 0,
      autoRestartEnabled: true,
      lifetimeRestartsUsed: MAX_SUPERVISOR_LIFETIME_RESTARTS,
    });
    expect(decision.action).toBe("stop-supervisor");
    expect(decision.reason).toBe("supervisor-lifetime-restart-cap");
  });

  it("parses and validates dev build ready sentinels", () => {
    expect(parseDevBuildReadySentinel(null)).toBe(false);
    expect(parseDevBuildReadySentinel({ writtenAtMs: "bad", outputFingerprint: "x" })).toBe(false);

    const sentinel = {
      writtenAtMs: 1_700_000_000_000,
      outputFingerprint: "dist-electron/main.cjs\x00123\x00456",
    };
    expect(parseDevBuildReadySentinel(sentinel)).toBe(true);
    expect(isDevBuildSentinelFresh(sentinel, sentinel.writtenAtMs)).toBe(true);
    expect(isDevBuildSentinelFresh(sentinel, sentinel.writtenAtMs + 1)).toBe(false);
  });

  it("exports the dev build sentinel relative path", () => {
    expect(DEV_BUILD_READY_SENTINEL_RELATIVE).toBe("dist-electron/.dev-build-ready.json");
  });

  it("fingerprints watched output files", () => {
    const fingerprint = fingerprintWatchedOutputFiles(process.cwd(), [
      { directory: ".", files: new Set(["package.json"]) },
    ]);

    expect(fingerprint).toContain("package.json");
    expect(fingerprintHasMissing(fingerprint)).toBe(false);
  });

  describe("supervisor lockfile", () => {
    let dir: string;
    let lockPath: string;

    beforeEach(() => {
      dir = mkdtempSync(join(tmpdir(), "supervisor-lock-"));
      lockPath = join(dir, "supervisor.lock");
    });

    afterEach(() => {
      rmSync(dir, { recursive: true, force: true });
    });

    it("acquires a fresh lock and writes our PID", () => {
      const result = acquireSupervisorLock(lockPath, {
        pid: 4242,
        now: () => 1_700_000_000_000,
        isAlive: () => true,
      });

      expect(result.acquired).toBe(true);
      const record = parseSupervisorLockFile(readFileSync(lockPath, "utf8"));
      expect(record).toEqual({ pid: 4242, startedAtMs: 1_700_000_000_000 });
    });

    it("refuses to acquire a lock held by a live PID belonging to another supervisor", () => {
      writeFileSync(lockPath, JSON.stringify({ pid: 9999, startedAtMs: 1_699_000_000_000 }));

      const result = acquireSupervisorLock(lockPath, {
        pid: 4242,
        now: () => 1_700_000_000_000,
        isAlive: (pid) => pid === 9999,
      });

      expect(result.acquired).toBe(false);
      if (!result.acquired) {
        expect(result.holder.pid).toBe(9999);
      }
    });

    it("overrides a stale lockfile whose holder is no longer alive", () => {
      writeFileSync(lockPath, JSON.stringify({ pid: 9999, startedAtMs: 1_699_000_000_000 }));

      const result = acquireSupervisorLock(lockPath, {
        pid: 4242,
        now: () => 1_700_000_000_000,
        isAlive: () => false,
      });

      expect(result.acquired).toBe(true);
      const record = parseSupervisorLockFile(readFileSync(lockPath, "utf8"));
      expect(record).toEqual({ pid: 4242, startedAtMs: 1_700_000_000_000 });
    });

    it("treats a corrupt lockfile as stale and takes it over", () => {
      writeFileSync(lockPath, "not-json{");

      const result = acquireSupervisorLock(lockPath, {
        pid: 4242,
        now: () => 1_700_000_000_000,
        isAlive: () => true,
      });

      expect(result.acquired).toBe(true);
    });

    it("releases only its own lockfile, leaving another supervisor's lock alone", () => {
      writeFileSync(lockPath, JSON.stringify({ pid: 7777, startedAtMs: 1_699_000_000_000 }));

      releaseSupervisorLock(lockPath, { pid: 4242 });

      const record = parseSupervisorLockFile(readFileSync(lockPath, "utf8"));
      expect(record).toEqual({ pid: 7777, startedAtMs: 1_699_000_000_000 });
    });

    it("releases its own lockfile cleanly", () => {
      writeFileSync(lockPath, JSON.stringify({ pid: 4242, startedAtMs: 1_700_000_000_000 }));

      releaseSupervisorLock(lockPath, { pid: 4242 });

      expect(() => readFileSync(lockPath, "utf8")).toThrow();
    });

    it("releases silently when no lockfile is present", () => {
      expect(() => releaseSupervisorLock(lockPath, { pid: 4242 })).not.toThrow();
    });

    it("exports the supervisor lock relative path", () => {
      expect(DEV_SUPERVISOR_LOCK_RELATIVE).toBe("dist-electron/.dev-supervisor.lock");
    });
  });

  it("detects orphan-to-init re-parenting", () => {
    expect(isOrphanedToInit(1)).toBe(true);
    expect(isOrphanedToInit(2)).toBe(false);
    expect(isOrphanedToInit(0)).toBe(false);
  });
});
