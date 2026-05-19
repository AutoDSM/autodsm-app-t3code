// @effect-diagnostics nodeBuiltinImport:off
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as fsPromises from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import {
  AutoDsmRpcError,
  CommandId,
  DEFAULT_MODEL,
  DEFAULT_RUNTIME_MODE,
  DEFAULT_PROVIDER_INTERACTION_MODE,
  ProviderInstanceId,
  type AutoDsmCreateWorkspaceInput,
  type AutoDsmCreateWorkspaceResult,
  type AutoDsmCreateWorkspaceThreadSeed,
  type AutoDsmWorkspaceStarterId,
  ProjectId,
  ThreadId,
} from "@t3tools/contracts";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";

import { OrchestrationEngineService } from "../orchestration/Services/OrchestrationEngine.ts";
import { ProcessRunner } from "../processRunner.ts";
import { detectPackageManager } from "./autoDsmHelpers.ts";
import { installDesignSystemSync } from "./designSystemInstall.ts";
import { seedBrandTokensFromWorkspace } from "./autoDsmTokenStore.ts";

const INSTALL_TIMEOUT = "600 seconds" as const;

interface ComponentAgentsManifest {
  readonly agents: ReadonlyArray<{
    readonly title: string;
    readonly componentPath: string;
  }>;
}

type CreateWorkspacePhase =
  | "start"
  | "template-copy"
  | "meta-write"
  | "install-start"
  | "install-end"
  | "design-system-install-start"
  | "design-system-install-end"
  | "manifest-read"
  | "project-create"
  | "thread-create"
  | "complete";

const createWorkspaceInflight = new Map<
  string,
  Effect.Effect<
    AutoDsmCreateWorkspaceResult,
    AutoDsmRpcError,
    OrchestrationEngineService | ProcessRunner
  >
>();

const createWorkspaceCompleted = new Map<string, AutoDsmCreateWorkspaceResult>();

function logCreateWorkspacePhase(
  phase: CreateWorkspacePhase,
  input: AutoDsmCreateWorkspaceInput,
  detail?: Record<string, unknown>,
): Effect.Effect<void> {
  return Effect.logInfo("autodsm.createWorkspace", {
    phase,
    starterId: input.starterId,
    environmentId: input.environmentId,
    requestId: input.requestId ?? null,
    ...detail,
  });
}

function resolveIdempotencyKey(input: AutoDsmCreateWorkspaceInput): string | null {
  const requestId = input.requestId?.trim();
  return requestId && requestId.length > 0 ? requestId : null;
}

export function resolveBundledWorkspaceTemplatesDir(): string {
  const here = fileURLToPath(new URL(".", import.meta.url));
  const candidates = [
    path.join(here, "workspace-templates"),
    path.join(here, "../workspace-templates"),
    path.join(here, "../../workspace-templates"),
    path.join(here, "../../../workspace-templates"),
    path.resolve(process.cwd(), "apps/server/workspace-templates"),
    path.resolve(process.cwd(), "dist/workspace-templates"),
    path.resolve(process.cwd(), "workspace-templates"),
  ];
  const starterProbes: readonly AutoDsmWorkspaceStarterId[] = [
    "shadcn-ui",
    "modern-starter",
    "tailwind-css",
    "mui",
    "chakra-ui",
  ];
  for (const dir of candidates) {
    for (const starter of starterProbes) {
      if (fs.existsSync(path.join(dir, starter, "package.json"))) {
        return dir;
      }
    }
  }
  return path.join(here, "../workspace-templates");
}

function resolveAutodsmUserRoot(): string {
  const override = process.env.AUTODSM_HOME?.trim();
  if (override && override.length > 0) {
    return path.resolve(override);
  }
  return path.join(os.homedir(), ".autodsm");
}

function titleForStarter(starterId: AutoDsmWorkspaceStarterId, displayName: string | undefined) {
  if (displayName?.trim()) {
    return displayName.trim().slice(0, 120);
  }
  switch (starterId) {
    case "modern-starter":
      return "AutoDSM workspace";
    case "shadcn-ui":
      return "Shadcn UI workspace";
    case "mui":
      return "Material UI workspace";
    case "chakra-ui":
      return "Chakra UI workspace";
    case "tailwind-css":
      return "Tailwind workspace";
    default:
      return "AutoDSM workspace";
  }
}

function installArgsForPackageManager(cwd: string): {
  readonly command: string;
  readonly args: readonly string[];
} {
  const pm = detectPackageManager(cwd);
  switch (pm) {
    case "bun":
      return { command: "bun", args: ["install"] };
    case "pnpm":
      return { command: "pnpm", args: ["install"] };
    case "yarn":
      return { command: "yarn", args: ["install"] };
    case "npm":
      return { command: "npm", args: ["install"] };
    default:
      return { command: "bun", args: ["install"] };
  }
}

const materializeWorkspaceCore = (
  input: AutoDsmCreateWorkspaceInput,
): Effect.Effect<
  AutoDsmCreateWorkspaceResult,
  AutoDsmRpcError,
  OrchestrationEngineService | ProcessRunner
> =>
  Effect.gen(function* () {
    yield* logCreateWorkspacePhase("start", input);

    if (process.env.AUTODSM_SKIP_INSTALL === "1") {
      // Test/dev escape hatch — templates must still be copy-valid.
    }

    const templatesRoot = resolveBundledWorkspaceTemplatesDir();
    const templateDir = path.join(templatesRoot, input.starterId);
    const templatePkgPath = path.join(templateDir, "package.json");
    if (!fs.existsSync(templatePkgPath)) {
      return yield* new AutoDsmRpcError({
        message: `Missing workspace template for starter "${input.starterId}" under ${templatesRoot}.`,
      });
    }

    const autodsmRoot = path.resolve(resolveAutodsmUserRoot());
    const workspaceId = crypto.randomUUID();
    const systemParent = path.join(autodsmRoot, "systems", workspaceId);
    const systemDir = path.join(systemParent, "system");

    yield* logCreateWorkspacePhase("template-copy", input, { templatesRoot, systemDir });
    yield* Effect.tryPromise({
      try: async () => {
        await fsPromises.mkdir(systemDir, { recursive: true });
        await fsPromises.cp(templateDir, systemDir, { recursive: true, force: true });
      },
      catch: (cause) =>
        new AutoDsmRpcError({ message: "Failed to copy workspace template", cause }),
    });

    const createdAt = yield* Effect.map(DateTime.now, DateTime.formatIso);
    const displayName = titleForStarter(input.starterId, input.displayName);
    const meta = {
      workspaceId,
      starterId: input.starterId,
      createdAt,
      systemPath: systemDir,
      displayName,
      ownerSubject: null,
      authProvider: null,
    };
    yield* logCreateWorkspacePhase("meta-write", input, { workspaceId });
    yield* Effect.tryPromise({
      try: () =>
        fsPromises.writeFile(
          path.join(systemParent, "meta.json"),
          `${JSON.stringify(meta, null, 2)}\n`,
          "utf8",
        ),
      catch: (cause) => new AutoDsmRpcError({ message: "Failed to write meta.json", cause }),
    });

    if (process.env.AUTODSM_SKIP_INSTALL !== "1") {
      const { command, args } = installArgsForPackageManager(systemDir);
      yield* logCreateWorkspacePhase("install-start", input, { command, args: [...args] });
      const runner = yield* ProcessRunner;
      const runExit = yield* Effect.exit(
        runner.run({
          command,
          args: [...args],
          cwd: systemDir,
          timeout: INSTALL_TIMEOUT,
          timeoutBehavior: "timedOutResult",
          maxOutputBytes: 8 * 1024 * 1024,
        }),
      );
      yield* logCreateWorkspacePhase("install-end", input, {
        success: runExit._tag === "Success" && !runExit.value.timedOut && runExit.value.code === 0,
      });
      if (runExit._tag !== "Success" || runExit.value.timedOut || runExit.value.code !== 0) {
        const tail =
          runExit._tag === "Success"
            ? `${runExit.value.stderr}\n${runExit.value.stdout}`.slice(-2000)
            : "process failed";
        return yield* new AutoDsmRpcError({
          message: `Dependency install failed (${command} ${args.join(" ")}): ${tail}`,
        });
      }
    }

    yield* logCreateWorkspacePhase("design-system-install-start", input, { systemDir });
    yield* Effect.sync(() => {
      installDesignSystemSync({
        starterId: input.starterId,
        cwd: systemDir,
        skipPackageInstall: process.env.AUTODSM_SKIP_INSTALL === "1",
      });
      seedBrandTokensFromWorkspace(systemDir);
    });
    yield* logCreateWorkspacePhase("design-system-install-end", input);

    yield* logCreateWorkspacePhase("manifest-read", input);
    const raw = yield* Effect.tryPromise({
      try: () => fsPromises.readFile(path.join(systemDir, "component-agents.json"), "utf8"),
      catch: (cause) =>
        new AutoDsmRpcError({
          message: "Invalid or missing component-agents.json in template",
          cause,
        }),
    });
    const manifest = yield* Effect.try({
      try: () => JSON.parse(raw) as ComponentAgentsManifest,
      catch: (cause) =>
        new AutoDsmRpcError({ message: "component-agents.json is not valid JSON", cause }),
    });

    if (!Array.isArray(manifest.agents) || manifest.agents.length === 0) {
      return yield* new AutoDsmRpcError({
        message: "component-agents.json must declare a non-empty agents array.",
      });
    }

    const projectId = ProjectId.make(crypto.randomUUID());
    const projectTitle = titleForStarter(input.starterId, input.displayName);
    const orchestrationEngine = yield* OrchestrationEngineService;

    yield* logCreateWorkspacePhase("project-create", input, { projectId, projectTitle });
    yield* orchestrationEngine
      .dispatch({
        type: "project.create",
        commandId: CommandId.make(`autodsm:proj:${crypto.randomUUID()}`),
        projectId,
        title: projectTitle,
        workspaceRoot: systemDir,
        createWorkspaceRootIfMissing: true,
        defaultModelSelection: {
          instanceId: ProviderInstanceId.make("codex"),
          model: DEFAULT_MODEL,
        },
        createdAt,
      })
      .pipe(
        Effect.mapError(
          (cause) =>
            new AutoDsmRpcError({
              message: cause instanceof Error ? cause.message : "project.create failed",
              cause,
            }),
        ),
      );

    const threads: AutoDsmCreateWorkspaceThreadSeed[] = [];
    for (const agent of manifest.agents) {
      const threadId = ThreadId.make(crypto.randomUUID());
      const componentPath = agent.componentPath.startsWith("/")
        ? agent.componentPath
        : `/${agent.componentPath}`;
      yield* logCreateWorkspacePhase("thread-create", input, {
        threadId,
        title: agent.title,
        componentPath,
      });
      yield* orchestrationEngine
        .dispatch({
          type: "thread.create",
          commandId: CommandId.make(`autodsm:thr:${crypto.randomUUID()}`),
          threadId,
          projectId,
          title: agent.title.slice(0, 200),
          modelSelection: {
            instanceId: ProviderInstanceId.make("codex"),
            model: DEFAULT_MODEL,
          },
          runtimeMode: DEFAULT_RUNTIME_MODE,
          interactionMode: DEFAULT_PROVIDER_INTERACTION_MODE,
          branch: null,
          worktreePath: null,
          createdAt,
        })
        .pipe(
          Effect.mapError(
            (cause) =>
              new AutoDsmRpcError({
                message: cause instanceof Error ? cause.message : "thread.create failed",
                cause,
              }),
          ),
        );
      threads.push({
        threadId,
        title: agent.title,
        componentPath,
      });
    }

    const result = {
      workspaceId,
      cwd: systemDir,
      projectId,
      starterId: input.starterId,
      threads,
    } satisfies AutoDsmCreateWorkspaceResult;

    yield* logCreateWorkspacePhase("complete", input, {
      workspaceId,
      projectId,
      threadCount: threads.length,
    });

    return result;
  });

export const autodsmMaterializeWorkspace = (
  input: AutoDsmCreateWorkspaceInput,
): Effect.Effect<
  AutoDsmCreateWorkspaceResult,
  AutoDsmRpcError,
  OrchestrationEngineService | ProcessRunner
> => {
  const idempotencyKey = resolveIdempotencyKey(input);
  if (idempotencyKey) {
    const completed = createWorkspaceCompleted.get(idempotencyKey);
    if (completed) {
      return Effect.succeed(completed);
    }

    const inflight = createWorkspaceInflight.get(idempotencyKey);
    if (inflight) {
      return inflight;
    }

    const effect = materializeWorkspaceCore(input).pipe(
      Effect.tap((result) =>
        Effect.sync(() => {
          createWorkspaceCompleted.set(idempotencyKey, result);
        }),
      ),
      Effect.ensuring(
        Effect.sync(() => {
          createWorkspaceInflight.delete(idempotencyKey);
        }),
      ),
    );
    createWorkspaceInflight.set(idempotencyKey, effect);
    return effect;
  }

  return materializeWorkspaceCore(input);
};

/** Test-only reset for module-level idempotency caches. */
export function resetAutodsmCreateWorkspaceCachesForTests(): void {
  createWorkspaceInflight.clear();
  createWorkspaceCompleted.clear();
}
