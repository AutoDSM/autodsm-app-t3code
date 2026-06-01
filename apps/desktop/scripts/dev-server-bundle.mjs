// Keeps `apps/server/dist/bin.mjs` fresh during desktop dev.
//
// The desktop app spawns its backend from the pre-built server bundle
// (`apps/server/dist/bin.mjs`), but `dev:desktop` only builds/watches the
// desktop + web packages — not `apps/server`. So server/contracts edits used to
// be invisible to the running desktop backend until a manual rebuild (which is
// how a newly-added RPC could be missing → "Failed to build variant showcase.").
//
// This runs the server's `dev:bundle` (tsdown --watch), re-emitting the bundle
// on source/contracts changes. `dev-electron.mjs` already watches
// `../server/dist/bin.mjs` and restarts Electron (re-spawning the backend) when
// it changes, so the new code is picked up automatically.
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const serverDir = resolve(here, "..", "..", "server");

const child = spawn("bun", ["run", "dev:bundle"], {
  cwd: serverDir,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.exit(1);
  }
  process.exit(code ?? 0);
});

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    if (!child.killed) {
      child.kill(sig);
    }
  });
}
