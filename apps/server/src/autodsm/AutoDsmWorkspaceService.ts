// @effect-diagnostics preferSchemaOverJson:off
// @effect-diagnostics globalDateInEffect:off
// @effect-diagnostics nodeBuiltinImport:off
import * as crypto from "node:crypto";
import * as fs from "node:fs/promises";
import * as path from "node:path";

import {
  AutoDsmChangeSetId,
  AutoDsmComponentId,
  AutoDsmGenerationPlanId,
  AutoDsmPublishedSnapshotId,
  AutoDsmRegistryEntryId,
  AutoDsmRenderManifestId,
  AutoDsmRenderPlanId,
  AutoDsmScanArtifactId,
  AutoDsmRpcError,
  CommandId,
  EventId,
  type AutoDsmBrandProfile,
  type AutoDsmBrandTokenAddInput,
  type AutoDsmBrandTokenRemoveInput,
  type AutoDsmBrandTokenResyncInput,
  type AutoDsmBrandTokenUpdateInput,
  type AutoDsmChangeOp,
  type AutoDsmChangeSet,
  type AutoDsmChangeSetCreateInput,
  type AutoDsmChangeSetIdInput,
  type AutoDsmChangeSetMutationResult,
  type AutoDsmChangeSetPreview,
  type AutoDsmComponentRegistry,
  type AutoDsmComponentRegistryEntry,
  type AutoDsmCwdInput,
  type AutoDsmCreateWorkspaceInput,
  type AutoDsmCreateWorkspaceResult,
  type AutoDsmListWorkspaceHistoryInput,
  type AutoDsmListWorkspaceHistoryResult,
  type AutoDsmEditOutcome,
  type AutoDsmExecuteRenderPlanResult,
  type AutoDsmGenerationPlan,
  type AutoDsmGenerationPlanAssembleInput,
  type AutoDsmGitSessionBranchInput,
  type AutoDsmGitSessionBranchResult,
  type AutoDsmIndexingProgressEvent,
  type AutoDsmIssuesForPromptInput,
  type AutoDsmIssuesForPromptResult,
  type AutoDsmProjectProfile,
  type AutoDsmPublishedSnapshot,
  type AutoDsmPublishedSnapshotExportInput,
  type AutoDsmPublishedSnapshotExportResult,
  type AutoDsmRegistryEntryInput,
  type AutoDsmRegistryEntryResult,
  type AutoDsmRenderDiagnosticsEntry,
  type AutoDsmRenderEnvironmentProfile,
  type AutoDsmRenderManifest,
  type AutoDsmRenderManifestLookupInput,
  type AutoDsmRenderPlan,
  type AutoDsmRenderPlanInput,
  type AutoDsmRenderPlanResult,
  type AutoDsmScanArtifact,
  type AutoDsmScanArtifactLookupInput,
  type AutoDsmScanRunInput,
  type AutoDsmScanRunResult,
  type AutoDsmSidecarStartInput,
  type AutoDsmSidecarStatusInput,
  type AutoDsmSidecarStatusResult,
  type AutoDsmWorkspaceBuildInput,
  type AutoDsmWorkspaceBuildResult,
  type ProjectBuildComponentPreviewResult,
  type ThreadId,
} from "@t3tools/contracts";
import { resolveAutodsmSessionBranchName } from "@t3tools/shared/git";
import * as Context from "effect/Context";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Ref from "effect/Ref";
import * as Schema from "effect/Schema";
import * as Stream from "effect/Stream";

import { OrchestrationEngineService } from "../orchestration/Services/OrchestrationEngine.ts";
import { analyzeReactComponentFile } from "../componentPreview/analyzeReactComponent.ts";
import { bundleComponentPreview } from "../componentPreview/bundleComponentPreview.ts";
import { WorkspaceEntries } from "../workspace/Services/WorkspaceEntries.ts";
import {
  WorkspaceFileSystem,
  WorkspaceFileSystemError,
} from "../workspace/Services/WorkspaceFileSystem.ts";
import {
  WorkspacePathOutsideRootError,
  WorkspacePaths,
} from "../workspace/Services/WorkspacePaths.ts";
import { isWorkspaceSrcComponentsUiRelativePath } from "../workspace/componentPreviewPaths.ts";

const isWorkspacePathOutsideRoot = Schema.is(WorkspacePathOutsideRootError);
const isWorkspaceFileSystemError = Schema.is(WorkspaceFileSystemError);

import {
  buildRenderEnvironmentProfileSlice,
  collectTailwindConfigPaths,
  collectTsconfigHints,
  detectCssPreviewEntryCandidates,
  detectFrameworks,
  detectPackageManager,
  fingerprintWorkspaceRoot,
  readPackageJson,
  sha256Hex,
} from "./autoDsmHelpers.ts";
import {
  addBrandToken,
  loadBrandProfile,
  removeBrandToken,
  resyncBrandTokens,
  updateBrandToken,
} from "./autoDsmTokenStore.ts";
import { readWorkspacePreviewCss } from "./readWorkspacePreviewCss.ts";
import { PROVIDER_PACK_CATALOG, matchProviderPacks } from "./providerPackCatalog.ts";
import {
  computeWorkspaceBuildInvalidationKey,
  executeWorkspacePackageBuild,
  workspaceBuildResultToRegistryGate,
} from "./workspaceBuild.ts";
import {
  peekAutodsmPreviewSidecar,
  startAutodsmPreviewSidecar,
} from "./renderRuntime/autodsmVitePreviewSidecar.ts";
import { autodsmMaterializeWorkspace } from "./autodsmCreateWorkspace.ts";
import { listAutodsmWorkspaceHistoryFromDisk } from "./autodsmWorkspaceHistory.ts";

function scanStaticRules(relativePath: string, source: string): AutoDsmScanArtifact["violations"] {
  const posixPath = relativePath.replace(/\\/g, "/");
  const violations: Array<AutoDsmScanArtifact["violations"][number]> = [];
  if (/\.(tsx|jsx)$/.test(posixPath) && /<img\b(?![^>]*\balt=)/.test(source)) {
    violations.push({
      id: sha256Hex(`${posixPath}:img-alt`),
      severity: "warn",
      ruleId: "jsx.a11y.img-alt",
      message: "Image tag missing explicit alt text.",
      filePath: posixPath.startsWith("/") ? posixPath : `/${posixPath}`,
      componentId: undefined,
      autofixHint: 'Add a descriptive alt="" prop.',
    });
  }
  return violations;
}

const AUTODSM_PROTECTED_SEGMENTS = ["node_modules/", ".git/", ".autodsm/credentials"];

function isProtectedAutodsmPath(relativePosix: string): boolean {
  const n = relativePosix.replace(/\\/g, "/").replace(/^\//, "");
  return AUTODSM_PROTECTED_SEGMENTS.some((s) => n.includes(s));
}

function buildProjectProfile(cwd: string): AutoDsmProjectProfile {
  const fingerprint = fingerprintWorkspaceRoot(cwd);
  const pkg = readPackageJson(cwd);
  const frameworks = detectFrameworks(pkg);
  const pkgVersions: Record<string, string> = {};
  if (pkg?.dependencies) {
    for (const [k, v] of Object.entries(pkg.dependencies).slice(0, 80)) {
      pkgVersions[k] = v;
    }
  }
  if (pkg?.devDependencies) {
    for (const [k, v] of Object.entries(pkg.devDependencies).slice(0, 80)) {
      pkgVersions[k] = v;
    }
  }

  return {
    meta: {
      kind: "project-profile",
      schemaVersion: 1,
      owner: "project-profile-indexer",
      invalidationKey: sha256Hex(`${fingerprint}:${frameworks.join("|")}`),
      consumers: ["brand-profile-indexer", "component-registry-indexer", "render-runtime"],
    },
    workspaceRootFingerprint: fingerprint,
    packageManager: detectPackageManager(cwd),
    frameworks: [...frameworks],
    monorepoWorkspacePatterns: [],
    typescriptProjectHints: [...collectTsconfigHints(cwd)],
    tailwindHintPaths: [...collectTailwindConfigPaths(cwd)],
    componentRoots: ["src/components"],
    packageVersions: pkgVersions,
    status: "ready",
  };
}

export interface AutoDsmWorkspaceShape {
  readonly createWorkspace: (
    input: AutoDsmCreateWorkspaceInput,
  ) => Effect.Effect<AutoDsmCreateWorkspaceResult, AutoDsmRpcError>;
  readonly listWorkspaceHistory: (
    input: AutoDsmListWorkspaceHistoryInput,
  ) => Effect.Effect<AutoDsmListWorkspaceHistoryResult, AutoDsmRpcError>;
  readonly getProjectProfile: (
    input: AutoDsmCwdInput,
  ) => Effect.Effect<AutoDsmProjectProfile, AutoDsmRpcError>;
  readonly getBrandProfile: (
    input: AutoDsmCwdInput,
  ) => Effect.Effect<AutoDsmBrandProfile, AutoDsmRpcError>;
  readonly addBrandToken: (
    input: AutoDsmBrandTokenAddInput,
  ) => Effect.Effect<AutoDsmBrandProfile, AutoDsmRpcError>;
  readonly removeBrandToken: (
    input: AutoDsmBrandTokenRemoveInput,
  ) => Effect.Effect<AutoDsmBrandProfile, AutoDsmRpcError>;
  readonly updateBrandToken: (
    input: AutoDsmBrandTokenUpdateInput,
  ) => Effect.Effect<AutoDsmBrandProfile, AutoDsmRpcError>;
  readonly resyncBrandTokens: (
    input: AutoDsmBrandTokenResyncInput,
  ) => Effect.Effect<AutoDsmBrandProfile, AutoDsmRpcError>;
  readonly getWorkspacePreviewCss: (
    input: AutoDsmCwdInput,
  ) => Effect.Effect<{ css: string }, AutoDsmRpcError>;
  readonly getComponentRegistry: (
    input: AutoDsmCwdInput,
  ) => Effect.Effect<AutoDsmComponentRegistry, AutoDsmRpcError>;
  readonly runWorkspaceBuild: (
    input: AutoDsmWorkspaceBuildInput,
  ) => Effect.Effect<AutoDsmWorkspaceBuildResult, AutoDsmRpcError>;
  readonly getComponentRegistryEntry: (
    input: AutoDsmRegistryEntryInput,
  ) => Effect.Effect<AutoDsmRegistryEntryResult, AutoDsmRpcError>;
  readonly getRenderEnvironmentProfile: (
    input: AutoDsmCwdInput,
  ) => Effect.Effect<AutoDsmRenderEnvironmentProfile, AutoDsmRpcError>;
  readonly getRenderManifest: (
    input: AutoDsmRenderManifestLookupInput,
  ) => Effect.Effect<{ manifest: AutoDsmRenderManifest | null }, AutoDsmRpcError>;
  readonly getScanArtifact: (
    input: AutoDsmScanArtifactLookupInput,
  ) => Effect.Effect<{ scan: AutoDsmScanArtifact | null }, AutoDsmRpcError>;
  readonly subscribeIndexingProgress: (
    input: AutoDsmCwdInput,
  ) => Effect.Effect<Stream.Stream<AutoDsmIndexingProgressEvent, AutoDsmRpcError>, AutoDsmRpcError>;
  readonly runScan: (
    input: AutoDsmScanRunInput,
  ) => Effect.Effect<AutoDsmScanRunResult, AutoDsmRpcError>;
  readonly buildRenderPlan: (
    input: AutoDsmRenderPlanInput,
  ) => Effect.Effect<AutoDsmRenderPlanResult, AutoDsmRpcError>;
  readonly executeRenderPlan: (
    input: AutoDsmRenderPlanInput,
  ) => Effect.Effect<AutoDsmExecuteRenderPlanResult, AutoDsmRpcError>;
  readonly getSidecarStatus: (
    input: AutoDsmSidecarStatusInput,
  ) => Effect.Effect<AutoDsmSidecarStatusResult, AutoDsmRpcError>;
  readonly startSidecar: (
    input: AutoDsmSidecarStartInput,
  ) => Effect.Effect<AutoDsmSidecarStatusResult, AutoDsmRpcError>;
  readonly getProviderCatalog: () => Effect.Effect<
    { readonly packs: typeof PROVIDER_PACK_CATALOG },
    AutoDsmRpcError
  >;
  readonly changeSetCreate: (
    input: AutoDsmChangeSetCreateInput,
  ) => Effect.Effect<AutoDsmChangeSetMutationResult, AutoDsmRpcError>;
  readonly changeSetPreview: (
    input: AutoDsmChangeSetIdInput,
  ) => Effect.Effect<AutoDsmChangeSetMutationResult, AutoDsmRpcError>;
  readonly changeSetApply: (
    input: AutoDsmChangeSetIdInput,
  ) => Effect.Effect<AutoDsmChangeSetMutationResult, AutoDsmRpcError>;
  readonly changeSetRollback: (
    input: AutoDsmChangeSetIdInput,
  ) => Effect.Effect<AutoDsmChangeSetMutationResult, AutoDsmRpcError>;
  readonly assembleGenerationPlan: (
    input: AutoDsmGenerationPlanAssembleInput,
  ) => Effect.Effect<{ plan: AutoDsmGenerationPlan }, AutoDsmRpcError>;
  readonly exportPublishedSnapshot: (
    input: AutoDsmPublishedSnapshotExportInput,
  ) => Effect.Effect<AutoDsmPublishedSnapshotExportResult, AutoDsmRpcError>;
  readonly prepareSessionBranch: (
    input: AutoDsmGitSessionBranchInput,
  ) => Effect.Effect<AutoDsmGitSessionBranchResult, AutoDsmRpcError>;
  readonly getIssuesForPrompt: (
    input: AutoDsmIssuesForPromptInput,
  ) => Effect.Effect<AutoDsmIssuesForPromptResult, AutoDsmRpcError>;
}

export class AutoDsmWorkspaceService extends Context.Service<
  AutoDsmWorkspaceService,
  AutoDsmWorkspaceShape
>()("t3/autodsm/AutoDsmWorkspaceService") {}

export const AutoDsmWorkspaceLive = Layer.effect(
  AutoDsmWorkspaceService,
  Effect.gen(function* () {
    const manifests = yield* Ref.make(new Map<string, AutoDsmRenderManifest>());
    const scans = yield* Ref.make(new Map<string, AutoDsmScanArtifact>());
    const changeSets = yield* Ref.make(new Map<string, AutoDsmChangeSet>());
    const workspaceBuildCache = yield* Ref.make(new Map<string, AutoDsmWorkspaceBuildResult>());

    const emitChangeSetActivity = (input: {
      readonly threadId: ThreadId | undefined;
      readonly changeSetId: string;
      readonly phase: "created" | "previewed" | "applied" | "rolled_back";
    }) => {
      const threadId = input.threadId;
      if (!threadId) {
        return Effect.void;
      }
      return Effect.gen(function* () {
        const orchestrationEngine = yield* OrchestrationEngineService;
        const createdAt = yield* Effect.map(DateTime.now, DateTime.formatIso);
        yield* orchestrationEngine
          .dispatch({
            type: "thread.activity.append",
            commandId: CommandId.make(`autodsm:${crypto.randomUUID()}`),
            threadId,
            activity: {
              id: EventId.make(crypto.randomUUID()),
              tone: "info",
              kind: "autodsm.changeset",
              summary: `AutoDSM ChangeSet ${input.phase}`,
              payload: { changeSetId: input.changeSetId, phase: input.phase },
              turnId: null,
              createdAt,
            },
            createdAt,
          })
          .pipe(Effect.catchCause(() => Effect.void));
      });
    };

    const getProjectProfile = (input: AutoDsmCwdInput) =>
      Effect.try({
        try: () => buildProjectProfile(input.cwd),
        catch: (cause) =>
          new AutoDsmRpcError({ message: "Failed to build project profile", cause }),
      });

    const getBrandProfile = (input: AutoDsmCwdInput) =>
      Effect.try({
        try: () => loadBrandProfile(input.cwd),
        catch: (cause) =>
          new AutoDsmRpcError({
            message: cause instanceof Error ? cause.message : "Failed to load brand profile",
            cause,
          }),
      });

    const addBrandTokenEffect = (input: AutoDsmBrandTokenAddInput) =>
      Effect.try({
        try: () => addBrandToken(input.cwd, input.token),
        catch: (cause) =>
          new AutoDsmRpcError({
            message: cause instanceof Error ? cause.message : "Failed to add brand token",
            cause,
          }),
      });

    const removeBrandTokenEffect = (input: AutoDsmBrandTokenRemoveInput) =>
      Effect.try({
        try: () => removeBrandToken(input.cwd, input.tokenId),
        catch: (cause) =>
          new AutoDsmRpcError({
            message: cause instanceof Error ? cause.message : "Failed to remove brand token",
            cause,
          }),
      });

    const updateBrandTokenEffect = (input: AutoDsmBrandTokenUpdateInput) =>
      Effect.try({
        try: () => updateBrandToken(input.cwd, input.tokenId, input.patch),
        catch: (cause) =>
          new AutoDsmRpcError({
            message: cause instanceof Error ? cause.message : "Failed to update brand token",
            cause,
          }),
      });

    const resyncBrandTokensEffect = (input: AutoDsmBrandTokenResyncInput) =>
      Effect.try({
        try: () =>
          resyncBrandTokens(input.cwd, {
            forceReseed: input.forceReseed === true,
          }),
        catch: (cause) =>
          new AutoDsmRpcError({
            message: cause instanceof Error ? cause.message : "Failed to resync brand tokens",
            cause,
          }),
      });

    const getWorkspacePreviewCssEffect = (input: AutoDsmCwdInput) =>
      Effect.try({
        try: () => ({ css: readWorkspacePreviewCss(input.cwd) }),
        catch: (cause) =>
          new AutoDsmRpcError({
            message:
              cause instanceof Error ? cause.message : "Failed to read workspace preview CSS",
            cause,
          }),
      });

    const resolveWorkspaceBuild = (input: {
      readonly cwd: string;
      readonly profile: AutoDsmProjectProfile;
      readonly force?: boolean;
    }) =>
      Effect.gen(function* () {
        const resolved = path.resolve(input.cwd);
        const invKey = computeWorkspaceBuildInvalidationKey(
          resolved,
          input.profile.workspaceRootFingerprint,
        );
        if (input.force === true) {
          yield* Ref.update(workspaceBuildCache, (m) => {
            const next = new Map(m);
            next.delete(invKey);
            return next;
          });
        } else {
          const cached = yield* Ref.get(workspaceBuildCache).pipe(Effect.map((m) => m.get(invKey)));
          if (cached) {
            return cached;
          }
        }
        const built = yield* executeWorkspacePackageBuild({
          cwd: input.cwd,
          profile: input.profile,
        });
        yield* Ref.update(workspaceBuildCache, (m) => new Map(m).set(invKey, built));
        return built;
      });

    const runWorkspaceBuild = (input: AutoDsmWorkspaceBuildInput) =>
      Effect.gen(function* () {
        const profile = yield* getProjectProfile({ cwd: input.cwd });
        return yield* resolveWorkspaceBuild({
          cwd: input.cwd,
          profile,
          force: input.force === true,
        });
      });

    const getRenderEnvironmentProfile = (input: AutoDsmCwdInput) =>
      Effect.gen(function* () {
        const profile = yield* getProjectProfile(input);
        const packs = matchProviderPacks(profile.frameworks).map((p) => ({
          id: p.id,
          layer: p.layer,
          reason: `framework match (${p.matchFrameworks.join(",")})`,
        }));
        return buildRenderEnvironmentProfileSlice({
          cwd: input.cwd,
          fingerprint: profile.workspaceRootFingerprint,
          detectedPackIds: packs,
        });
      });

    const getComponentRegistry = (input: AutoDsmCwdInput) =>
      Effect.gen(function* () {
        const workspaceEntries = yield* WorkspaceEntries;
        const workspacePaths = yield* WorkspacePaths;
        const profile = yield* getProjectProfile(input);

        const buildResult = yield* resolveWorkspaceBuild({
          cwd: input.cwd,
          profile,
          force: false,
        });
        const gate = workspaceBuildResultToRegistryGate(buildResult);

        const search = yield* workspaceEntries
          .search({
            cwd: input.cwd,
            query: "",
            limit: 2000,
            entryKind: "file",
            entryPathSubstring: "/src/components/",
          })
          .pipe(Effect.mapError((cause) => new AutoDsmRpcError({ message: cause.detail, cause })));

        const componentFiles = search.entries.filter(
          (e) => e.kind === "file" && isWorkspaceSrcComponentsUiRelativePath(e.path),
        );

        const entries: AutoDsmComponentRegistryEntry[] = [];

        yield* Effect.forEach(
          componentFiles,
          (entry) =>
            Effect.gen(function* () {
              const relativePath = entry.path.replace(/\\/g, "/");
              if (!isWorkspaceSrcComponentsUiRelativePath(relativePath)) {
                return;
              }
              const resolved = yield* workspacePaths
                .resolveRelativePathWithinRoot({
                  workspaceRoot: input.cwd,
                  relativePath,
                })
                .pipe(
                  Effect.mapError(
                    (cause) =>
                      new AutoDsmRpcError({
                        message: "Registry indexer path resolution failed",
                        cause,
                      }),
                  ),
                );

              const manifest = analyzeReactComponentFile({
                absolutePath: resolved.absolutePath,
                cwd: input.cwd,
                relativePathPosix: resolved.relativePath,
              });

              const entryId = AutoDsmRegistryEntryId.make(
                sha256Hex(
                  `${resolved.relativePath}:${manifest.exports.map((e) => e.name).join(",")}`,
                ),
              );
              const componentId = AutoDsmComponentId.make(
                sha256Hex(`${resolved.relativePath}:component`),
              );

              const propsByExport: Record<
                string,
                (typeof manifest.propsByExport)[number]["props"]
              > = {};
              for (const row of manifest.propsByExport) {
                propsByExport[row.exportName] = [...row.props];
              }

              entries.push({
                id: entryId,
                componentId,
                relativePath: relativePath.startsWith("/") ? relativePath : `/${relativePath}`,
                exports: [...manifest.exports],
                propsByExport,
                slotShape: undefined,
                providerHints: [],
                dependencyEdges: [],
                usageImports: {},
                manifest,
              });
            }),
          { concurrency: 4 },
        );

        const processed = entries.length;

        const gateInvalidationSuffix = gate
          ? `:gate:${gate.code}:${buildResult.invalidationKey}`
          : "";
        const registryInvalidation = sha256Hex(
          `${profile.workspaceRootFingerprint}:${buildResult.invalidationKey}:${componentFiles.map((e) => e.path).join("\u0000")}${gateInvalidationSuffix}`,
        );

        let status: "not_started" | "indexing" | "ready" | "stale" | "failed" | "partial";
        if (processed === 0) {
          status = gate
            ? gate.code === "workspace_build_skipped"
              ? "partial"
              : "failed"
            : "partial";
        } else if (gate) {
          status = "partial";
        } else {
          status = "ready";
        }

        const registry: AutoDsmComponentRegistry = {
          meta: {
            kind: "component-registry",
            schemaVersion: 1,
            owner: "component-registry-indexer",
            invalidationKey: registryInvalidation,
            consumers: ["workbench-ui", "render-runtime", "scanner", "agent-supervisor"],
          },
          entries,
          status,
          ...(gate !== null ? { gate } : {}),
        };

        return registry;
      });

    const getComponentRegistryEntry = (input: AutoDsmRegistryEntryInput) =>
      Effect.gen(function* () {
        const registry = yield* getComponentRegistry({ cwd: input.cwd });
        const entry = registry.entries.find((e) => e.id === input.entryId) ?? null;
        return { entry };
      });

    const getRenderManifest = (input: AutoDsmRenderManifestLookupInput) =>
      Effect.gen(function* () {
        const map = yield* Ref.get(manifests);
        return { manifest: map.get(input.manifestId) ?? null };
      });

    const getScanArtifact = (input: AutoDsmScanArtifactLookupInput) =>
      Effect.gen(function* () {
        const map = yield* Ref.get(scans);
        return { scan: map.get(input.scanId) ?? null };
      });

    const subscribeIndexingProgress = (input: AutoDsmCwdInput) =>
      Effect.gen(function* () {
        const profile = yield* getProjectProfile(input);
        const ev: AutoDsmIndexingProgressEvent = {
          cwd: input.cwd,
          status: profile.status,
          phase: "project-profile",
          processed: profile.frameworks.length,
          total: undefined,
          message: undefined,
        };
        return Stream.concat(Stream.succeed(ev), Stream.never);
      });

    const runScan = (input: AutoDsmScanRunInput) =>
      Effect.gen(function* () {
        const workspaceFileSystem = yield* WorkspaceFileSystem;
        const rel = input.relativePath.replace(/\\/g, "/").replace(/^\//, "");
        const contents = yield* workspaceFileSystem
          .readFile({ cwd: input.cwd, relativePath: rel })
          .pipe(
            Effect.mapError((cause) => {
              if (isWorkspacePathOutsideRoot(cause)) {
                return new AutoDsmRpcError({ message: "Path escapes workspace root", cause });
              }
              if (isWorkspaceFileSystemError(cause)) {
                return new AutoDsmRpcError({ message: cause.detail, cause });
              }
              return new AutoDsmRpcError({ message: "Failed to read workspace file", cause });
            }),
          );

        const violations = scanStaticRules(rel, contents.contents);
        const scanId = AutoDsmScanArtifactId.make(sha256Hex(`${rel}:${violations.length}:scan`));
        const fingerprint = fingerprintWorkspaceRoot(input.cwd);
        const scan: AutoDsmScanArtifact = {
          id: scanId,
          meta: {
            kind: "scan-artifact",
            schemaVersion: 1,
            owner: "scanner-worker",
            invalidationKey: sha256Hex(`${fingerprint}:${rel}:${sha256Hex(contents.contents)}`),
            consumers: ["workbench-ui", "agent-supervisor"],
          },
          targetPath: `/${rel}`,
          componentId: input.componentId,
          renderManifestId: input.renderManifestId,
          violations,
        };

        yield* Ref.update(scans, (m) => new Map(m).set(scan.id, scan));

        return { scan };
      });

    const locateRegistryPreviewTarget = (input: AutoDsmRenderPlanInput) =>
      Effect.gen(function* () {
        const workspacePaths = yield* WorkspacePaths;
        const registry = yield* getComponentRegistry({ cwd: input.cwd });
        const hit = registry.entries.find((e) => e.componentId === input.componentId) ?? null;
        if (hit === null) {
          return yield* new AutoDsmRpcError({
            message: "Component id is not indexed under src/components for this workspace.",
          });
        }

        const relativePath = hit.relativePath.replace(/\\/g, "/");
        const resolved = yield* workspacePaths
          .resolveRelativePathWithinRoot({
            workspaceRoot: input.cwd,
            relativePath,
          })
          .pipe(
            Effect.mapError(
              (cause) =>
                new AutoDsmRpcError({
                  message: "Failed to resolve component path for preview",
                  cause,
                }),
            ),
          );

        const relImport = path.relative(input.cwd, resolved.absolutePath).split(path.sep).join("/");
        const componentImportSpecifier = relImport.startsWith(".") ? relImport : `./${relImport}`;
        return { hit, resolvedAbsolutePath: resolved.absolutePath, componentImportSpecifier };
      });

    const finalizeRenderPlan = (params: {
      readonly input: AutoDsmRenderPlanInput;
      readonly target: {
        readonly hit: AutoDsmComponentRegistryEntry;
        readonly resolvedAbsolutePath: string;
        readonly componentImportSpecifier: string;
      };
      readonly profile: AutoDsmProjectProfile;
      readonly rep: AutoDsmRenderEnvironmentProfile;
      readonly sidecarPeekOrigin: string | undefined;
      readonly cssEntryRelativePaths: readonly string[];
    }): AutoDsmRenderPlan => {
      const planId = AutoDsmRenderPlanId.make(
        sha256Hex(
          `${params.input.componentId}:${params.input.exportName}:${sha256Hex(params.input.propsJson)}`,
        ),
      );
      const componentRelativePath = params.target.hit.relativePath.startsWith("/")
        ? params.target.hit.relativePath
        : `/${params.target.hit.relativePath}`;

      return {
        id: planId,
        meta: {
          kind: "render-plan",
          schemaVersion: 1,
          owner: "render-runtime",
          invalidationKey: sha256Hex(`${params.rep.meta.invalidationKey}:${planId}`),
          consumers: ["preview-controller", "scanner"],
        },
        componentId: params.input.componentId,
        componentRelativePath,
        componentImportSpecifier: params.target.componentImportSpecifier,
        exportName: params.input.exportName,
        propsJson: params.input.propsJson,
        viewport: params.input.viewport ?? {
          label: "default",
          width: 1280,
          height: 720,
          devicePixelRatio: 1,
        },
        theme: params.input.theme ?? "system",
        deterministicSeed: sha256Hex(params.profile.workspaceRootFingerprint).slice(0, 16),
        repInvalidationKey: params.rep.meta.invalidationKey,
        providerPackIds: params.rep.detectedPacks.map((p) => p.id),
        cssEntryRelativePaths: [...params.cssEntryRelativePaths],
        mockDescriptors: [],
        sidecarOrigin: params.sidecarPeekOrigin,
      };
    };

    const buildRenderPlan = (input: AutoDsmRenderPlanInput) =>
      Effect.gen(function* () {
        const profile = yield* getProjectProfile({ cwd: input.cwd });
        const rep = yield* getRenderEnvironmentProfile({ cwd: input.cwd });
        const peek = peekAutodsmPreviewSidecar(input.cwd);
        const css = detectCssPreviewEntryCandidates(input.cwd);
        const target = yield* locateRegistryPreviewTarget(input);
        const plan = finalizeRenderPlan({
          input,
          target,
          profile,
          rep,
          sidecarPeekOrigin: peek?.origin,
          cssEntryRelativePaths: css,
        });
        return { plan };
      });

    const executeRenderPlan = (input: AutoDsmRenderPlanInput) =>
      Effect.gen(function* () {
        const workspaceFileSystem = yield* WorkspaceFileSystem;
        const startedAtMs = Date.now();

        yield* Effect.promise(() => startAutodsmPreviewSidecar(input.cwd)).pipe(
          Effect.catchCause(() => Effect.void),
        );

        const profile = yield* getProjectProfile({ cwd: input.cwd });
        const rep = yield* getRenderEnvironmentProfile({ cwd: input.cwd });
        const peek = peekAutodsmPreviewSidecar(input.cwd);
        const css = detectCssPreviewEntryCandidates(input.cwd);

        const target = yield* locateRegistryPreviewTarget(input);
        const plan = finalizeRenderPlan({
          input,
          target,
          profile,
          rep,
          sidecarPeekOrigin: peek?.origin,
          cssEntryRelativePaths: css,
        });

        const bundlingStarted = Date.now();
        const bundled = yield* Effect.tryPromise({
          try: async () =>
            await bundleComponentPreview({
              cwd: input.cwd,
              absoluteComponentPath: target.resolvedAbsolutePath,
              relativePathPosix: target.hit.relativePath.replace(/^\//, ""),
              exportName: input.exportName,
            }),
          catch: (cause): ProjectBuildComponentPreviewResult => ({
            ok: false,
            javascript: undefined,
            warnings: [],
            errors: [cause instanceof Error ? `${cause.name}: ${cause.message}` : String(cause)],
          }),
        });

        const bundleFinished = Date.now();
        const elapsedBundle = Math.max(0, bundleFinished - bundlingStarted);

        const diagnostics: AutoDsmRenderDiagnosticsEntry[] = [];
        let nextAt = bundleFinished;
        for (const warning of bundled.warnings) {
          diagnostics.push({
            level: "warn",
            source: "esbuild",
            message: warning,
            atMs: nextAt++,
          });
        }
        for (const err of bundled.errors) {
          diagnostics.push({
            level: "error",
            source: "esbuild",
            message: err,
            atMs: nextAt++,
          });
        }

        const assembledAtIso = yield* Effect.map(DateTime.now, DateTime.formatIso);

        const manifestId = AutoDsmRenderManifestId.make(crypto.randomUUID());
        const previewSessionId = crypto.randomUUID();
        const manifest: AutoDsmRenderManifest = {
          id: manifestId,
          meta: {
            kind: "render-manifest",
            schemaVersion: 1,
            owner: "render-runtime",
            invalidationKey: sha256Hex(
              `${plan.meta.invalidationKey}:${manifestId}:${bundled.ok ? "ok" : "fail"}:${assembledAtIso}`,
            ),
            consumers: ["preview-controller", "workbench-ui", "agent-supervisor"],
          },
          planId: plan.id,
          ok: bundled.ok,
          cwd: input.cwd,
          previewSessionId,
          loadedModules: bundled.ok === true ? ["esbuild/component-entry"] : [],
          warnings: [...bundled.warnings],
          errors: [...bundled.errors],
          diagnostics,
          screenshotIds: [],
          timingsMs: {
            bundle: elapsedBundle,
            total: Math.max(0, Date.now() - startedAtMs),
          },
          viewportResults: [
            {
              viewport: plan.viewport,
              ok: bundled.ok,
              notes: bundled.ok ? [] : [...bundled.errors],
            },
          ],
        };

        yield* workspaceFileSystem
          .writeFile({
            cwd: input.cwd,
            relativePath: `.autodsm/render-manifests/${manifestId}.json`,
            contents: `${JSON.stringify(manifest, null, 2)}\n`,
          })
          .pipe(Effect.catchCause(() => Effect.void));

        yield* Ref.update(manifests, (m) => new Map(m).set(manifest.id, manifest));

        const out: AutoDsmExecuteRenderPlanResult = {
          plan,
          manifest,
          ...(bundled.ok === true &&
          bundled.javascript !== undefined &&
          bundled.javascript.length > 0
            ? { bundledJavascript: bundled.javascript }
            : {}),
        };
        return out;
      });

    const getSidecarStatus = (input: AutoDsmSidecarStatusInput) =>
      Effect.sync((): AutoDsmSidecarStatusResult => {
        const hit = peekAutodsmPreviewSidecar(input.cwd);
        return hit ? { running: true, port: hit.port, origin: hit.origin } : { running: false };
      });

    const startSidecar = (input: AutoDsmSidecarStartInput) =>
      Effect.tryPromise({
        try: async () => {
          try {
            const s = await startAutodsmPreviewSidecar(input.cwd);
            return {
              running: true,
              port: s.port,
              origin: s.origin,
            } satisfies AutoDsmSidecarStatusResult;
          } catch (cause) {
            return {
              running: false,
              lastError: cause instanceof Error ? cause.message : String(cause),
            } satisfies AutoDsmSidecarStatusResult;
          }
        },
        catch: (cause) =>
          new AutoDsmRpcError({ message: "Failed to start preview sidecar", cause }),
      });

    const getProviderCatalog = () => Effect.succeed({ packs: PROVIDER_PACK_CATALOG } as const);

    const changeSetCreate = (input: AutoDsmChangeSetCreateInput) =>
      Effect.gen(function* () {
        for (const op of input.ops) {
          const rp = op.path.replace(/\\/g, "/").replace(/^\//, "");
          if (isProtectedAutodsmPath(rp)) {
            return yield* new AutoDsmRpcError({
              message: `Protected path not allowed: ${op.path}`,
            });
          }
        }

        const createdAt = yield* Effect.map(DateTime.now, DateTime.formatIso);
        const id = AutoDsmChangeSetId.make(crypto.randomUUID());
        const changeSet: AutoDsmChangeSet = {
          id,
          meta: {
            kind: "change-set",
            schemaVersion: 1,
            owner: "changeset-service",
            invalidationKey: sha256Hex(input.ops.map((o) => `${o.kind}:${o.path}`).join("|")),
            consumers: ["diff-panel", "git-workflow", "agent-supervisor"],
          },
          cwd: input.cwd,
          ops: [...input.ops],
          createdAt,
        };

        yield* Ref.update(changeSets, (m) => new Map(m).set(id, changeSet));
        yield* emitChangeSetActivity({
          threadId: input.threadId,
          changeSetId: id,
          phase: "created",
        });

        return { changeSet };
      });

    const loadChangeSet = (id: AutoDsmChangeSetId) =>
      Effect.gen(function* () {
        const map = yield* Ref.get(changeSets);
        const cs = map.get(id);
        if (!cs) {
          return yield* new AutoDsmRpcError({ message: `Unknown ChangeSet ${id}` });
        }
        return cs;
      });

    const changeSetPreview = (input: AutoDsmChangeSetIdInput) =>
      Effect.gen(function* () {
        const workspaceFileSystem = yield* WorkspaceFileSystem;
        const changeSet = yield* loadChangeSet(input.changeSetId);
        const files: Array<{
          path: string;
          before?: string;
          after?: string;
        }> = [];

        for (const op of changeSet.ops) {
          const rp = op.path.replace(/\\/g, "/").replace(/^\//, "");
          if (op.kind === "update" || op.kind === "create") {
            const before =
              op.kind === "update"
                ? yield* workspaceFileSystem.readFile({ cwd: input.cwd, relativePath: rp }).pipe(
                    Effect.map((r) => r.contents),
                    Effect.orElseSucceed(() => ""),
                  )
                : undefined;
            files.push({
              path: op.path.startsWith("/") ? op.path : `/${op.path}`,
              ...(before !== undefined ? { before } : {}),
              after: op.contents ?? "",
            });
          }
        }

        const preview = {
          changeSetId: input.changeSetId,
          files,
          validationNotes: [],
        } satisfies AutoDsmChangeSetPreview;

        yield* emitChangeSetActivity({
          threadId: input.threadId,
          changeSetId: input.changeSetId,
          phase: "previewed",
        });

        return { changeSet, preview };
      });

    const applyOp = (cwd: string, op: AutoDsmChangeOp) =>
      Effect.gen(function* () {
        const workspaceFileSystem = yield* WorkspaceFileSystem;
        const workspacePaths = yield* WorkspacePaths;
        const rp = op.path.replace(/\\/g, "/").replace(/^\//, "");
        if (isProtectedAutodsmPath(rp)) {
          return yield* new AutoDsmRpcError({
            message: `Refusing to mutate protected path ${op.path}`,
          });
        }
        if (op.kind === "create" || op.kind === "update") {
          yield* workspaceFileSystem
            .writeFile({
              cwd,
              relativePath: rp,
              contents: op.contents ?? "",
            })
            .pipe(
              Effect.mapError((cause) => {
                if (isWorkspacePathOutsideRoot(cause)) {
                  return new AutoDsmRpcError({ message: "Path escapes workspace root", cause });
                }
                if (isWorkspaceFileSystemError(cause)) {
                  return new AutoDsmRpcError({ message: cause.detail, cause });
                }
                return new AutoDsmRpcError({ message: "Workspace write failed", cause });
              }),
            );
          return;
        }
        if (op.kind === "delete") {
          const resolved = yield* workspacePaths
            .resolveRelativePathWithinRoot({ workspaceRoot: cwd, relativePath: rp })
            .pipe(
              Effect.mapError(
                (cause) => new AutoDsmRpcError({ message: "delete path invalid", cause }),
              ),
            );
          yield* Effect.tryPromise({
            try: () => fs.unlink(resolved.absolutePath),
            catch: (cause) => new AutoDsmRpcError({ message: "Failed to delete file", cause }),
          });
          return;
        }
        return yield* new AutoDsmRpcError({ message: `Unsupported op ${op.kind} in this build` });
      });

    const changeSetApply = (input: AutoDsmChangeSetIdInput) =>
      Effect.gen(function* () {
        const changeSet = yield* loadChangeSet(input.changeSetId);
        for (const op of changeSet.ops) {
          yield* applyOp(input.cwd, op);
        }

        const recordedAt = yield* Effect.map(DateTime.now, DateTime.formatIso);
        const outcome: AutoDsmEditOutcome = {
          changeSetId: input.changeSetId,
          disposition: "accepted",
          affectedComponentIds: [],
          recordedAt,
        };

        yield* emitChangeSetActivity({
          threadId: input.threadId,
          changeSetId: input.changeSetId,
          phase: "applied",
        });

        return { changeSet, outcome };
      });

    const changeSetRollback = (input: AutoDsmChangeSetIdInput) =>
      Effect.gen(function* () {
        const changeSet = yield* loadChangeSet(input.changeSetId);
        const recordedAt = yield* Effect.map(DateTime.now, DateTime.formatIso);
        const outcome: AutoDsmEditOutcome = {
          changeSetId: input.changeSetId,
          disposition: "reverted",
          affectedComponentIds: [],
          recordedAt,
        };

        yield* emitChangeSetActivity({
          threadId: input.threadId,
          changeSetId: input.changeSetId,
          phase: "rolled_back",
        });

        return { changeSet, outcome };
      });

    const assembleGenerationPlan = (input: AutoDsmGenerationPlanAssembleInput) =>
      Effect.gen(function* () {
        const profile = yield* getProjectProfile({ cwd: input.cwd });
        const brand = yield* getBrandProfile({ cwd: input.cwd });
        const assembledAt = yield* Effect.map(DateTime.now, DateTime.formatIso);
        const plan: AutoDsmGenerationPlan = {
          id: AutoDsmGenerationPlanId.make(crypto.randomUUID()),
          meta: {
            kind: "generation-plan",
            schemaVersion: 1,
            owner: "agent-supervisor",
            invalidationKey: sha256Hex(
              `${input.userIntent}:${input.threadId ?? ""}:${input.projectId ?? ""}`,
            ),
            consumers: ["provider-drivers", "changeset-service"],
          },
          threadId: input.threadId,
          projectId: input.projectId,
          slices: [
            {
              sliceId: "environment",
              summary: `Frameworks: ${profile.frameworks.join(", ")}`,
              budgetChars: 1200,
            },
            {
              sliceId: "brand",
              summary: brand.tokens
                .slice(0, 24)
                .map((t) => `${t.name ?? t.id}=${t.value}`)
                .join(", "),
              budgetChars: 800,
            },
            {
              sliceId: "intent",
              summary: input.userIntent.slice(0, 4000),
              budgetChars: input.userIntent.length,
            },
          ],
          proposedChangeSetId: undefined,
          assembledAt,
        };
        return { plan };
      });

    const exportPublishedSnapshot = (input: AutoDsmPublishedSnapshotExportInput) =>
      Effect.gen(function* () {
        const workspaceFileSystem = yield* WorkspaceFileSystem;
        const profile = yield* getProjectProfile(input);
        const brand = yield* getBrandProfile(input);
        const registry = yield* getComponentRegistry(input);

        const exportedAt = yield* Effect.map(DateTime.now, DateTime.formatIso);
        const snapshot: AutoDsmPublishedSnapshot = {
          id: AutoDsmPublishedSnapshotId.make(crypto.randomUUID()),
          meta: {
            kind: "published-snapshot",
            schemaVersion: 1,
            owner: "publish-service",
            invalidationKey: sha256Hex(
              `${profile.meta.invalidationKey}:${registry.meta.invalidationKey}`,
            ),
            consumers: ["brand-book-export"],
          },
          brandProfile: brand,
          registrySlice: registry.entries.slice(0, 120),
          manifests: [],
          assetHashes: {},
          exportedAt,
        };

        const relativeExportDir = ".autodsm/exports";
        const fileName = `snapshot-${snapshot.exportedAt.replaceAll(":", "-")}.json`;
        const relativePath = `${relativeExportDir}/${fileName}`;

        yield* workspaceFileSystem
          .writeFile({
            cwd: input.cwd,
            relativePath,
            contents: `${JSON.stringify(snapshot, null, 2)}\n`,
          })
          .pipe(
            Effect.mapError(
              (cause) =>
                new AutoDsmRpcError({
                  message: "Failed to write PublishedSnapshot export",
                  cause,
                }),
            ),
          );

        return { snapshot, exportPath: `/${relativePath}` };
      });

    const prepareSessionBranch = (input: AutoDsmGitSessionBranchInput) =>
      Effect.sync(
        () =>
          ({
            branchName: resolveAutodsmSessionBranchName(input.sessionKey),
          }) satisfies AutoDsmGitSessionBranchResult,
      );

    const getIssuesForPrompt = (input: AutoDsmIssuesForPromptInput) =>
      Effect.gen(function* () {
        const max = input.maxViolations ?? 24;
        const map = yield* Ref.get(scans);
        const candidates = [...map.values()].filter(
          (s) => !input.componentId || s.componentId === input.componentId,
        );
        const scan = candidates.at(-1);
        const lines =
          scan?.violations
            .slice(0, max)
            .map((v) => `- [${v.severity}] ${v.ruleId}: ${v.message}`) ?? [];
        const text =
          lines.length > 0
            ? `AutoDSM scan issues:\n${lines.join("\n")}`
            : "AutoDSM scan issues: none recorded for this selection.";
        return { text, scanId: scan?.id };
      });

    const createWorkspace = autodsmMaterializeWorkspace;
    const listWorkspaceHistory = listAutodsmWorkspaceHistoryFromDisk;

    return {
      createWorkspace,
      listWorkspaceHistory,
      getProjectProfile,
      getBrandProfile,
      addBrandToken: addBrandTokenEffect,
      removeBrandToken: removeBrandTokenEffect,
      updateBrandToken: updateBrandTokenEffect,
      resyncBrandTokens: resyncBrandTokensEffect,
      getWorkspacePreviewCss: getWorkspacePreviewCssEffect,
      getComponentRegistry,
      runWorkspaceBuild,
      getComponentRegistryEntry,
      getRenderEnvironmentProfile,
      getRenderManifest,
      getScanArtifact,
      subscribeIndexingProgress,
      runScan,
      buildRenderPlan,
      executeRenderPlan,
      getSidecarStatus,
      startSidecar,
      getProviderCatalog,
      changeSetCreate,
      changeSetPreview,
      changeSetApply,
      changeSetRollback,
      assembleGenerationPlan,
      exportPublishedSnapshot,
      prepareSessionBranch,
      getIssuesForPrompt,
    } as unknown as AutoDsmWorkspaceShape;
  }),
);
