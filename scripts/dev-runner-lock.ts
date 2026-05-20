// @effect-diagnostics nodeBuiltinImport:off
import * as fs from "node:fs";
import * as path from "node:path";
import { spawnSync } from "node:child_process";

export interface DevDesktopLockRecord {
  readonly pid: number;
  readonly mode: "dev:desktop";
  readonly startedAt: string;
  readonly instanceKey: string;
  readonly t3Home: string;
  readonly serverPort: string;
  readonly webPort: string;
}

export interface BuildDesktopDevInstanceKeyInput {
  readonly t3Home: string;
  readonly portOffset: number | undefined;
  readonly devInstance: string | undefined;
  readonly explicitT3Home: boolean;
}

export function buildDesktopDevInstanceKey(input: BuildDesktopDevInstanceKeyInput): string {
  const hasExplicitIsolation =
    input.explicitT3Home ||
    (input.devInstance !== undefined && input.devInstance.trim().length > 0) ||
    input.portOffset !== undefined;

  if (hasExplicitIsolation) {
    const devInstance = input.devInstance?.trim() ?? "";
    const portOffset = input.portOffset === undefined ? "" : String(input.portOffset);
    return `custom:${input.t3Home}:${devInstance}:${portOffset}`;
  }

  return `default:${input.t3Home}`;
}

export function isProcessAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) {
    return false;
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    const code =
      error !== null && typeof error === "object" && "code" in error
        ? (error as NodeJS.ErrnoException).code
        : undefined;
    return code !== "ESRCH";
  }
}

export function readDevDesktopLock(lockPath: string): DevDesktopLockRecord | null {
  try {
    const raw = fs.readFileSync(lockPath, "utf8");
    const parsed = JSON.parse(raw) as Partial<DevDesktopLockRecord>;
    if (
      parsed.mode !== "dev:desktop" ||
      typeof parsed.pid !== "number" ||
      typeof parsed.instanceKey !== "string" ||
      typeof parsed.t3Home !== "string"
    ) {
      return null;
    }

    return {
      pid: parsed.pid,
      mode: "dev:desktop",
      startedAt: typeof parsed.startedAt === "string" ? parsed.startedAt : "",
      instanceKey: parsed.instanceKey,
      t3Home: parsed.t3Home,
      serverPort: typeof parsed.serverPort === "string" ? parsed.serverPort : "",
      webPort: typeof parsed.webPort === "string" ? parsed.webPort : "",
    };
  } catch {
    return null;
  }
}

export function writeDevDesktopLock(lockPath: string, record: DevDesktopLockRecord): void {
  fs.mkdirSync(path.dirname(lockPath), { recursive: true });
  fs.writeFileSync(lockPath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
}

export function removeDevDesktopLockIfOwned(lockPath: string, pid: number): void {
  const existing = readDevDesktopLock(lockPath);
  if (existing?.pid !== pid) {
    return;
  }

  try {
    fs.unlinkSync(lockPath);
  } catch {
    // ignore missing lock during shutdown races
  }
}

export type DevDesktopLockAvailability =
  | { readonly ok: true; readonly replacedStaleLock: boolean }
  | { readonly ok: false; readonly existing: DevDesktopLockRecord };

export function assertDevDesktopLockAvailable(
  lockPath: string,
  record: DevDesktopLockRecord,
): DevDesktopLockAvailability {
  const existing = readDevDesktopLock(lockPath);
  if (existing === null) {
    return { ok: true, replacedStaleLock: false };
  }

  if (existing.instanceKey !== record.instanceKey) {
    return { ok: true, replacedStaleLock: false };
  }

  if (existing.pid === record.pid) {
    return { ok: true, replacedStaleLock: false };
  }

  if (isProcessAlive(existing.pid)) {
    return { ok: false, existing };
  }

  return { ok: true, replacedStaleLock: true };
}

export function cleanupStaleDesktopElectronApps(desktopDir: string): void {
  if (process.platform === "win32") {
    return;
  }

  spawnSync("pkill", ["-f", "--", `--t3code-dev-root=${desktopDir}`], { stdio: "ignore" });
}

export function registerDevDesktopLockRelease(lockPath: string, pid: number): void {
  const release = () => {
    removeDevDesktopLockIfOwned(lockPath, pid);
  };

  process.once("exit", release);
  process.once("SIGINT", release);
  process.once("SIGTERM", release);
}
