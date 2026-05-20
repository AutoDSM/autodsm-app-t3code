import { spawnSync } from "node:child_process";

/**
 * Command-line markers that identify desktop dev Electron processes for this repo.
 *
 * @param {string} desktopDir
 * @returns {readonly string[]}
 */
export function desktopDevProcessMarkers(desktopDir) {
  return [
    `--t3code-dev-root=${desktopDir}`,
    `${desktopDir}/dist-electron/main.cjs`,
    `${desktopDir}/.electron-runtime/T3 Code (Dev).app/Contents/MacOS/Electron`,
  ];
}

/**
 * Terminate orphaned desktop dev Electron processes for this workspace.
 *
 * @param {string} desktopDir
 */
export function cleanupStaleDesktopDevProcesses(desktopDir) {
  if (process.platform === "win32") {
    return;
  }

  for (const marker of desktopDevProcessMarkers(desktopDir)) {
    spawnSync("pkill", ["-f", marker], { stdio: "ignore" });
  }
}

/**
 * @param {string} desktopDir
 * @returns {readonly number[]}
 */
export function listLiveDesktopDevProcesses(desktopDir) {
  if (process.platform === "win32") {
    return [];
  }

  const markers = desktopDevProcessMarkers(desktopDir);
  const result = spawnSync("ps", ["-A", "-o", "pid=,command="], { encoding: "utf8" });
  if (result.status !== 0 || typeof result.stdout !== "string") {
    return [];
  }

  const pids = new Set();
  for (const line of result.stdout.split("\n")) {
    if (!markers.some((marker) => line.includes(marker))) {
      continue;
    }

    const pid = Number.parseInt(line.trim().split(/\s+/)[0] ?? "", 10);
    if (Number.isInteger(pid) && pid > 0) {
      pids.add(pid);
    }
  }

  return [...pids];
}

/** @deprecated Use {@link listLiveDesktopDevProcesses}. */
export function listLiveDesktopDevRootPids(desktopDir) {
  return listLiveDesktopDevProcesses(desktopDir);
}

/**
 * @param {string} desktopDir
 * @param {number} gracePeriodMs
 */
export async function ensureNoLiveDesktopDevRootProcesses(desktopDir, gracePeriodMs) {
  cleanupStaleDesktopDevProcesses(desktopDir);

  const remaining = listLiveDesktopDevProcesses(desktopDir);
  if (remaining.length === 0) {
    return;
  }

  for (const pid of remaining) {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // Ignore stale PID races.
    }
  }

  if (gracePeriodMs > 0) {
    await new Promise((resolve) => {
      setTimeout(resolve, gracePeriodMs);
    });
  }

  cleanupStaleDesktopDevProcesses(desktopDir);

  for (const pid of listLiveDesktopDevProcesses(desktopDir)) {
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      // Ignore stale PID races.
    }
  }
}
