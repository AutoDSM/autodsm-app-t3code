import type { AutoDsmWorkspaceBuildResult } from "@t3tools/contracts";
import { describe, expect, it } from "vitest";

import {
  packageManagerRunScriptInvocation,
  pickWorkspacePackageBuildScriptName,
  tailWorkspaceBuildOutput,
  workspaceBuildResultToRegistryGate,
} from "./workspaceBuild.ts";

const invKey = "inv";
const fingerprint = "fp";

function buildResult(
  partial: Partial<AutoDsmWorkspaceBuildResult> &
    Pick<
      AutoDsmWorkspaceBuildResult,
      "skipped" | "ok" | "commandDisplay" | "exitCode" | "timedOut"
    >,
): AutoDsmWorkspaceBuildResult {
  return {
    skipReason: null,
    stdoutTail: "",
    stderrTail: "",
    ...partial,
    invalidationKey: partial.invalidationKey ?? invKey,
    workspaceRootFingerprint: partial.workspaceRootFingerprint ?? fingerprint,
  };
}

describe("workspaceBuild helpers", () => {
  it("pickWorkspacePackageBuildScriptName prefers scripts.build only", () => {
    expect(pickWorkspacePackageBuildScriptName(null)).toBeNull();
    expect(pickWorkspacePackageBuildScriptName({ scripts: { dev: "vite" } })).toBeNull();
    expect(pickWorkspacePackageBuildScriptName({ scripts: { build: "tsc" } })).toBe("build");
    expect(pickWorkspacePackageBuildScriptName({ scripts: { build: "  " } })).toBeNull();
  });

  it("packageManagerRunScriptInvocation maps package managers", () => {
    expect(packageManagerRunScriptInvocation("npm", "build")).toEqual({
      command: "npm",
      args: ["run", "build"],
    });
    expect(packageManagerRunScriptInvocation("pnpm", "build")).toEqual({
      command: "pnpm",
      args: ["run", "build"],
    });
    expect(packageManagerRunScriptInvocation("yarn", "build")).toEqual({
      command: "yarn",
      args: ["run", "build"],
    });
    expect(packageManagerRunScriptInvocation("bun", "build")).toEqual({
      command: "bun",
      args: ["run", "build"],
    });
    expect(packageManagerRunScriptInvocation("unknown", "build")).toEqual({
      command: "npm",
      args: ["run", "build"],
    });
  });

  it("workspaceBuildResultToRegistryGate returns null on success", () => {
    expect(
      workspaceBuildResultToRegistryGate(
        buildResult({
          skipped: false,
          ok: true,
          commandDisplay: "npm run build",
          exitCode: 0,
          timedOut: false,
        }),
      ),
    ).toBeNull();
  });

  it("workspaceBuildResultToRegistryGate maps skipped builds", () => {
    const gate = workspaceBuildResultToRegistryGate(
      buildResult({
        skipped: true,
        ok: false,
        skipReason: "No scripts.build entry in package.json.",
        commandDisplay: "",
        exitCode: null,
        timedOut: false,
      }),
    );
    expect(gate?.code).toBe("workspace_build_skipped");
  });

  it("workspaceBuildResultToRegistryGate maps failures and timeouts", () => {
    expect(
      workspaceBuildResultToRegistryGate(
        buildResult({
          skipped: false,
          ok: false,
          commandDisplay: "npm run build",
          exitCode: 1,
          timedOut: false,
          stderrTail: "compile error",
        }),
      )?.code,
    ).toBe("workspace_build_failed");

    expect(
      workspaceBuildResultToRegistryGate(
        buildResult({
          skipped: false,
          ok: false,
          commandDisplay: "npm run build",
          exitCode: null,
          timedOut: true,
        }),
      )?.code,
    ).toBe("workspace_build_timed_out");
  });

  it("workspaceBuildResultToRegistryGate maps runner errors", () => {
    const gate = workspaceBuildResultToRegistryGate(
      buildResult({
        skipped: false,
        ok: false,
        commandDisplay: "",
        exitCode: null,
        timedOut: false,
        stderrTail: "spawn ENOENT",
      }),
    );
    expect(gate?.code).toBe("workspace_build_runner_error");
  });

  it("tailWorkspaceBuildOutput caps length", () => {
    const long = "x".repeat(20);
    expect(tailWorkspaceBuildOutput(long, 10)).toBe(`…${"x".repeat(10)}`);
    expect(tailWorkspaceBuildOutput("short", 100)).toBe("short");
  });
});
