// @effect-diagnostics nodeBuiltinImport:off
import * as fs from "node:fs";
import * as path from "node:path";

import type {
  AutoDsmComponentRegistryGateReason,
  AutoDsmProjectProfile,
  AutoDsmWorkspaceBuildResult,
} from "@t3tools/contracts";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";

import { ProcessRunner } from "../processRunner.ts";
import { detectPackageManager, readPackageJson, sha256Hex } from "./autoDsmHelpers.ts";

const OUTPUT_TAIL_MAX = 6000;
export const WORKSPACE_PACKAGE_BUILD_TIMEOUT = "900 seconds" as const;

export function tailWorkspaceBuildOutput(text: string, max = OUTPUT_TAIL_MAX): string {
  if (text.length <= max) {
    return text;
  }
  return `…${text.slice(-max)}`;
}

function lockfileSignature(resolvedRoot: string): string {
  const names = [
    "bun.lockb",
    "bun.lock",
    "pnpm-lock.yaml",
    "yarn.lock",
    "package-lock.json",
  ] as const;
  for (const name of names) {
    const abs = path.join(resolvedRoot, name);
    try {
      const st = fs.statSync(abs);
      return `${name}:${st.size}:${Math.floor(st.mtimeMs)}`;
    } catch {
      /* next candidate */
    }
  }
  return "no-lockfile";
}

export function computeWorkspaceBuildInvalidationKey(
  cwd: string,
  workspaceRootFingerprint: string,
): string {
  const resolved = path.resolve(cwd);
  let pkgHash = "missing";
  try {
    pkgHash = sha256Hex(fs.readFileSync(path.join(resolved, "package.json"), "utf8"));
  } catch {
    /* package.json unreadable */
  }
  const pm = detectPackageManager(resolved);
  const lockSig = lockfileSignature(resolved);
  return sha256Hex(`${resolved}\0${workspaceRootFingerprint}\0${pkgHash}\0${pm}\0${lockSig}`);
}

/** Prefer `scripts.build` only (v1 product rule). */
export function pickWorkspacePackageBuildScriptName(
  pkg: {
    readonly scripts?: Record<string, string>;
  } | null,
): string | null {
  const raw = pkg?.scripts?.build?.trim();
  return raw !== undefined && raw.length > 0 ? "build" : null;
}

export function packageManagerRunScriptInvocation(
  packageManager: AutoDsmProjectProfile["packageManager"],
  scriptName: string,
): { readonly command: string; readonly args: readonly string[] } {
  const args = ["run", scriptName] as const;
  switch (packageManager) {
    case "bun":
      return { command: "bun", args };
    case "pnpm":
      return { command: "pnpm", args };
    case "yarn":
      return { command: "yarn", args };
    case "npm":
      return { command: "npm", args };
    default:
      return { command: "npm", args };
  }
}

export function workspaceBuildResultToRegistryGate(
  result: AutoDsmWorkspaceBuildResult,
): AutoDsmComponentRegistryGateReason | null {
  if (result.skipped) {
    return {
      code: "workspace_build_skipped",
      summary: result.skipReason ?? "Workspace build was skipped (no scripts.build).",
      commandDisplay: null,
      stdoutTail: result.stdoutTail.trim().length > 0 ? result.stdoutTail : null,
      stderrTail: result.stderrTail.trim().length > 0 ? result.stderrTail : null,
      exitCode: null,
    };
  }
  if (result.ok) {
    return null;
  }
  if (!result.commandDisplay.trim() && result.stderrTail.trim().length > 0) {
    return {
      code: "workspace_build_runner_error",
      summary: tailWorkspaceBuildOutput(result.stderrTail, 280),
      commandDisplay: null,
      stdoutTail: result.stdoutTail.trim().length > 0 ? result.stdoutTail : null,
      stderrTail: result.stderrTail.trim().length > 0 ? result.stderrTail : null,
      exitCode: result.exitCode,
    };
  }

  const code = result.timedOut ? "workspace_build_timed_out" : "workspace_build_failed";
  return {
    code,
    summary: result.timedOut
      ? `Build timed out (${WORKSPACE_PACKAGE_BUILD_TIMEOUT}): ${result.commandDisplay}`
      : `Build failed (${result.exitCode ?? "non-zero"}): ${result.commandDisplay}`,
    commandDisplay: result.commandDisplay.trim().length > 0 ? result.commandDisplay : null,
    stdoutTail: result.stdoutTail.trim().length > 0 ? result.stdoutTail : null,
    stderrTail: result.stderrTail.trim().length > 0 ? result.stderrTail : null,
    exitCode: result.exitCode,
  };
}

export function executeWorkspacePackageBuild(input: {
  readonly cwd: string;
  readonly profile: AutoDsmProjectProfile;
}): Effect.Effect<AutoDsmWorkspaceBuildResult, never, ProcessRunner> {
  return Effect.gen(function* () {
    const resolved = path.resolve(input.cwd);
    const fingerprint = input.profile.workspaceRootFingerprint;
    const invKey = computeWorkspaceBuildInvalidationKey(resolved, fingerprint);
    const pkg = readPackageJson(resolved);
    const scriptName = pickWorkspacePackageBuildScriptName(pkg);

    if (!scriptName) {
      return {
        skipped: true,
        ok: false,
        skipReason: "No scripts.build entry in package.json.",
        commandDisplay: "",
        exitCode: null,
        timedOut: false,
        stdoutTail: "",
        stderrTail: "",
        invalidationKey: invKey,
        workspaceRootFingerprint: fingerprint,
      } satisfies AutoDsmWorkspaceBuildResult;
    }

    const { command, args } = packageManagerRunScriptInvocation(
      input.profile.packageManager,
      scriptName,
    );
    const commandDisplay = `${command} ${args.join(" ")}`;

    const runner = yield* ProcessRunner;
    const runExit = yield* Effect.exit(
      runner.run({
        command,
        args: [...args],
        cwd: resolved,
        timeout: WORKSPACE_PACKAGE_BUILD_TIMEOUT,
        timeoutBehavior: "timedOutResult",
        maxOutputBytes: 8 * 1024 * 1024,
      }),
    );

    const outcome =
      runExit._tag === "Success"
        ? runExit.value
        : {
            stdout: "",
            stderr: Cause.pretty(runExit.cause),
            code: null as number | null,
            timedOut: false,
            stdoutTruncated: false,
            stderrTruncated: false,
          };

    const ok = !outcome.timedOut && outcome.code !== null && outcome.code === 0;

    return {
      skipped: false,
      ok,
      skipReason: null,
      commandDisplay,
      exitCode: outcome.code,
      timedOut: outcome.timedOut,
      stdoutTail: tailWorkspaceBuildOutput(outcome.stdout),
      stderrTail: tailWorkspaceBuildOutput(outcome.stderr),
      invalidationKey: invKey,
      workspaceRootFingerprint: fingerprint,
    } satisfies AutoDsmWorkspaceBuildResult;
  });
}
