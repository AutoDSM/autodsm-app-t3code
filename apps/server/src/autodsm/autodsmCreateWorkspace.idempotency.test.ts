// @effect-diagnostics nodeBuiltinImport:off
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { EnvironmentId } from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { ChildProcessSpawner } from "effect/unstable/process";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { OrchestrationEngineService } from "../orchestration/Services/OrchestrationEngine.ts";
import { ProcessRunner } from "../processRunner.ts";
import {
  autodsmMaterializeWorkspace,
  resetAutodsmCreateWorkspaceCachesForTests,
} from "./autodsmCreateWorkspace.ts";
import { isAutodsmStagingDirectoryName } from "./autodsmWorkspaceStaging.ts";

describe("autodsmMaterializeWorkspace idempotency", () => {
  let previousHome: string | undefined;
  let previousSkipInstall: string | undefined;
  let projectCreateCount = 0;

  beforeEach(() => {
    previousHome = process.env.AUTODSM_HOME;
    previousSkipInstall = process.env.AUTODSM_SKIP_INSTALL;
    process.env.AUTODSM_HOME = fs.mkdtempSync(
      path.join(os.tmpdir(), "autodsm-create-idempotency-test-"),
    );
    process.env.AUTODSM_SKIP_INSTALL = "1";
    projectCreateCount = 0;
    resetAutodsmCreateWorkspaceCachesForTests();
  });

  afterEach(() => {
    resetAutodsmCreateWorkspaceCachesForTests();

    if (previousHome === undefined) {
      delete process.env.AUTODSM_HOME;
    } else {
      process.env.AUTODSM_HOME = previousHome;
    }

    if (previousSkipInstall === undefined) {
      delete process.env.AUTODSM_SKIP_INSTALL;
    } else {
      process.env.AUTODSM_SKIP_INSTALL = previousSkipInstall;
    }
  });

  it("runs materialize once for concurrent calls sharing requestId", async () => {
    const testLayer = Layer.mergeAll(
      Layer.mock(ProcessRunner)({
        run: () =>
          Effect.succeed({
            code: ChildProcessSpawner.ExitCode(0),
            timedOut: false,
            stdout: "",
            stderr: "",
            stdoutTruncated: false,
            stderrTruncated: false,
          }),
      }),
      Layer.mock(OrchestrationEngineService)({
        dispatch: (command) => {
          if (command.type === "project.create") {
            projectCreateCount += 1;
          }
          return Effect.succeed({ sequence: 0 });
        },
      }),
    );

    const input = {
      starterId: "shadcn-ui" as const,
      environmentId: EnvironmentId.make("env-test"),
      requestId: "req-concurrent-create",
      displayName: "Shadcn UI workspace",
    };

    const runCreate = () =>
      Effect.runPromise(autodsmMaterializeWorkspace(input).pipe(Effect.provide(testLayer)));

    const [first, second] = await Promise.all([runCreate(), runCreate()]);

    const systemsRoot = path.join(process.env.AUTODSM_HOME!, "systems");
    const workspaceCount = fs
      .readdirSync(systemsRoot)
      .filter((entry) => !isAutodsmStagingDirectoryName(entry)).length;

    expect(projectCreateCount).toBe(1);
    expect(workspaceCount).toBe(1);
    expect(first).toEqual(second);
    expect(first.projectId).toBe(second.projectId);
    expect(first.workspaceId).toBe(second.workspaceId);
  });
});
