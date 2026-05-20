// @effect-diagnostics nodeBuiltinImport:off
// @effect-diagnostics globalDate:off
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  assertDevDesktopLockAvailable,
  buildDesktopDevInstanceKey,
  isProcessAlive,
  readDevDesktopLock,
  removeDevDesktopLockIfOwned,
  writeDevDesktopLock,
  type DevDesktopLockRecord,
} from "./dev-runner-lock.ts";

function makeLockRecord(overrides: Partial<DevDesktopLockRecord> = {}): DevDesktopLockRecord {
  return {
    pid: process.pid,
    mode: "dev:desktop",
    startedAt: new Date().toISOString(),
    instanceKey: "default:/tmp/t3",
    t3Home: "/tmp/t3",
    serverPort: "13773",
    webPort: "5733",
    ...overrides,
  };
}

describe("dev-runner-lock", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  function tempLockPath(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "t3-dev-lock-"));
    tempDirs.push(dir);
    return path.join(dir, "dev", "desktop-dev.lock.json");
  }

  it("builds separate keys for explicit dev instances", () => {
    const defaultKey = buildDesktopDevInstanceKey({
      t3Home: "/Users/me/.t3",
      portOffset: undefined,
      devInstance: undefined,
      explicitT3Home: false,
    });
    const isolatedKey = buildDesktopDevInstanceKey({
      t3Home: "/Users/me/.t3",
      portOffset: 4,
      devInstance: "feature-a",
      explicitT3Home: false,
    });

    expect(defaultKey).toBe("default:/Users/me/.t3");
    expect(isolatedKey).toBe("custom:/Users/me/.t3:feature-a:4");
    expect(defaultKey).not.toBe(isolatedKey);
  });

  it("ignores stale locks for the same default instance", () => {
    const lockPath = tempLockPath();
    writeDevDesktopLock(
      lockPath,
      makeLockRecord({
        pid: 999_999,
        instanceKey: "default:/tmp/t3",
      }),
    );

    const availability = assertDevDesktopLockAvailable(
      lockPath,
      makeLockRecord({
        pid: process.pid,
        instanceKey: "default:/tmp/t3",
      }),
    );

    expect(availability).toEqual({ ok: true, replacedStaleLock: true });
  });

  it("blocks when a live lock exists for the same instance", () => {
    const lockPath = tempLockPath();
    writeDevDesktopLock(
      lockPath,
      makeLockRecord({
        pid: process.pid,
        instanceKey: "default:/tmp/t3",
      }),
    );

    const availability = assertDevDesktopLockAvailable(
      lockPath,
      makeLockRecord({
        pid: process.pid + 1,
        instanceKey: "default:/tmp/t3",
      }),
    );

    expect(availability.ok).toBe(false);
    if (!availability.ok) {
      expect(availability.existing.pid).toBe(process.pid);
    }
  });

  it("allows parallel locks for different instance keys", () => {
    const lockPath = tempLockPath();
    writeDevDesktopLock(
      lockPath,
      makeLockRecord({
        pid: process.pid,
        instanceKey: "default:/tmp/t3",
      }),
    );

    const availability = assertDevDesktopLockAvailable(
      lockPath,
      makeLockRecord({
        pid: process.pid + 1,
        instanceKey: "custom:/tmp/t3:feature-a:2",
      }),
    );

    expect(availability).toEqual({ ok: true, replacedStaleLock: false });
  });

  it("removes only the owned lock file", () => {
    const lockPath = tempLockPath();
    writeDevDesktopLock(lockPath, makeLockRecord({ pid: process.pid }));
    removeDevDesktopLockIfOwned(lockPath, process.pid + 1);
    expect(readDevDesktopLock(lockPath)?.pid).toBe(process.pid);

    removeDevDesktopLockIfOwned(lockPath, process.pid);
    expect(readDevDesktopLock(lockPath)).toBeNull();
  });

  it("detects the current process as alive", () => {
    expect(isProcessAlive(process.pid)).toBe(true);
    expect(isProcessAlive(999_999)).toBe(false);
  });
});
