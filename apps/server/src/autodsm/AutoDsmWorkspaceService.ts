// @effect-diagnostics preferSchemaOverJson:off
// @effect-diagnostics globalDate:off
// @effect-diagnostics globalDateInEffect:off
// @effect-diagnostics globalConsoleInEffect:off
// @effect-diagnostics globalTimers:off
// @effect-diagnostics nodeBuiltinImport:off
import * as crypto from "node:crypto";
import { existsSync } from "node:fs";
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
  type AutoDsmDesignBriefApplyInput,
  type AutoDsmDesignBriefApplyResult,
  type AutoDsmDesignBriefProposal,
  type AutoDsmDesignBriefProposeInput,
  type AutoDsmDesignBriefProposeResult,
  type AutoDsmDesignBriefUploadInput,
  type AutoDsmDesignBriefUploadResult,
  type AutoDsmDesignBriefGetResult,
  type AutoDsmInstallIconLibraryInput,
  type AutoDsmInstallIconLibraryResult,
  type AutoDsmChangeOp,
  type AutoDsmChangeSet,
  type AutoDsmChangeHunk,
  type AutoDsmChangeSetCreateInput,
  type AutoDsmChangeSetFromTurnDiffInput,
  type AutoDsmChangeSetHunkDecisionInput,
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
  type AutoDsmDeleteWorkspaceInput,
  type AutoDsmDeleteWorkspaceResult,
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
  type AutoDsmPublishedExportInput,
  type AutoDsmPublishedExportResult,
  type AutoDsmPullRequestCreateInput,
  type AutoDsmPullRequestCreateResult,
  type AutoDsmPullRequestListInput,
  type AutoDsmPullRequestListResult,
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
  type AutoDsmActivityListInput,
  type AutoDsmActivityListResult,
  type AutoDsmComponentAgentListInput,
  type AutoDsmComponentAgentListResult,
  type AutoDsmComponentAgentRegisterInput,
  type AutoDsmComponentAgentRegisterResult,
  type AutoDsmComponentAgentUpdateInput,
  type AutoDsmComponentAgentUpdateResult,
  type AutoDsmComponentAgentRemoveInput,
  type AutoDsmComponentAgentRemoveResult,
  type AutoDsmComponentAgentResyncInput,
  type AutoDsmComponentAgentResyncResult,
  type AutoDsmComponentConversationAppendInput,
  type AutoDsmComponentConversationAppendResult,
  type AutoDsmComponentConversationGetInput,
  type AutoDsmComponentConversationGetResult,
  type AutoDsmSessionChangeSetListInput,
  type AutoDsmSessionChangeSetListResult,
  type AutoDsmSessionCreateInput,
  type AutoDsmSessionCreateResult,
  type AutoDsmSessionGetInput,
  type AutoDsmSessionGetResult,
  type ProjectBuildComponentPreviewResult,
  type ThreadId,
} from "@t3tools/contracts";
import { resolveAutodsmSessionBranchName } from "@t3tools/shared/git";
import * as Cause from "effect/Cause";
import * as Context from "effect/Context";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Ref from "effect/Ref";
import * as Schema from "effect/Schema";
import * as Stream from "effect/Stream";

import { OrchestrationEngineService } from "../orchestration/Services/OrchestrationEngine.ts";
import {
  analyzeReactComponentBatch,
  analyzeReactComponentFile,
} from "../componentPreview/analyzeReactComponent.ts";
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
import { loadDesignBrief, writeDesignBrief } from "./designBriefStore.ts";
import {
  makeDesignBriefGenerateFromTextGeneration,
  proposeFromBrief,
} from "./designBriefProposer.ts";
import { TextGeneration } from "../textGeneration/TextGeneration.ts";
import { applyProposal } from "./designBriefApplier.ts";
import { installIconLibrary } from "./autoDsmIconLibrary.ts";
import { readWorkspacePreviewCss } from "./readWorkspacePreviewCss.ts";
import { PROVIDER_PACK_CATALOG, matchProviderPacks } from "./providerPackCatalog.ts";
import {
  computeWorkspaceBuildInvalidationKey,
  executeWorkspacePackageBuild,
  workspaceBuildResultToRegistryGate,
} from "./workspaceBuild.ts";
import { isWorkspaceCwdInsideStagingDirectory } from "./autodsmWorkspaceStaging.ts";
import {
  peekAutodsmPreviewSidecar,
  startAutodsmPreviewSidecar,
} from "./renderRuntime/autodsmVitePreviewSidecar.ts";
import { autodsmMaterializeWorkspace } from "./autodsmCreateWorkspace.ts";
import { autodsmDeleteWorkspaceFromDisk } from "./autodsmDeleteWorkspace.ts";
import { listAutodsmWorkspaceHistoryFromDisk } from "./autodsmWorkspaceHistory.ts";
import { appendWorkspaceActivity, listWorkspaceActivity } from "./activityLog.ts";
import {
  appendChangeSetToSessionManifest,
  findComponentAgentByComponentPath,
  loadComponentAgentsManifest,
  reconcileComponentIdsFromRegistry,
  registerComponentAgent as registerComponentAgentRecord,
  removeComponentAgent as removeComponentAgentRecord,
  resyncComponentAgentsFromTemplate,
  updateComponentAgent as updateComponentAgentRecord,
} from "./componentAgentStore.ts";
import { extractCssVarTokenNames } from "./componentTokenUsage.ts";
import { appendComponentConversation, loadComponentConversation } from "./conversationStore.ts";
import {
  hydrateChangeSetFromDisk,
  listPersistedChangeSetsForSession,
  persistChangeSet,
  resolveSessionIdForChangeSet,
} from "./changeSetStore.ts";
import {
  deriveChangeSetOpsAndHunks,
  reconstructFileWithDecisions,
  summarizeDecisions,
} from "./changeSetHunks.ts";
import { createSession, loadSession } from "./sessionStore.ts";
import { createPullRequest, listPullRequests } from "./pullRequestStore.ts";
import { exportPublishedExport } from "./publishedExportStore.ts";

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
  readonly deleteWorkspace: (
    input: AutoDsmDeleteWorkspaceInput,
  ) => Effect.Effect<AutoDsmDeleteWorkspaceResult, AutoDsmRpcError>;
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
  readonly uploadDesignBrief: (
    input: AutoDsmDesignBriefUploadInput,
  ) => Effect.Effect<AutoDsmDesignBriefUploadResult, AutoDsmRpcError>;
  readonly proposeDesignBrief: (
    input: AutoDsmDesignBriefProposeInput,
  ) => Effect.Effect<AutoDsmDesignBriefProposeResult, AutoDsmRpcError>;
  readonly applyDesignBriefProposal: (
    input: AutoDsmDesignBriefApplyInput,
  ) => Effect.Effect<AutoDsmDesignBriefApplyResult, AutoDsmRpcError>;
  readonly getDesignBrief: (
    input: AutoDsmCwdInput,
  ) => Effect.Effect<AutoDsmDesignBriefGetResult, AutoDsmRpcError>;
  readonly installIconLibrary: (
    input: AutoDsmInstallIconLibraryInput,
  ) => Effect.Effect<AutoDsmInstallIconLibraryResult, AutoDsmRpcError>;
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
  readonly changeSetCreateFromTurnDiff: (
    input: AutoDsmChangeSetFromTurnDiffInput,
  ) => Effect.Effect<AutoDsmChangeSetMutationResult, AutoDsmRpcError>;
  readonly changeSetSetHunkDecisions: (
    input: AutoDsmChangeSetHunkDecisionInput,
  ) => Effect.Effect<AutoDsmChangeSetMutationResult, AutoDsmRpcError>;
  readonly changeSetApplyDecisions: (
    input: AutoDsmChangeSetIdInput,
  ) => Effect.Effect<AutoDsmChangeSetMutationResult, AutoDsmRpcError>;
  readonly assembleGenerationPlan: (
    input: AutoDsmGenerationPlanAssembleInput,
  ) => Effect.Effect<{ plan: AutoDsmGenerationPlan }, AutoDsmRpcError>;
  readonly exportPublishedSnapshot: (
    input: AutoDsmPublishedSnapshotExportInput,
  ) => Effect.Effect<AutoDsmPublishedSnapshotExportResult, AutoDsmRpcError>;
  readonly exportPublishedExport: (
    input: AutoDsmPublishedExportInput,
  ) => Effect.Effect<AutoDsmPublishedExportResult, AutoDsmRpcError>;
  readonly createPullRequest: (
    input: AutoDsmPullRequestCreateInput,
  ) => Effect.Effect<AutoDsmPullRequestCreateResult, AutoDsmRpcError>;
  readonly listPullRequests: (
    input: AutoDsmPullRequestListInput,
  ) => Effect.Effect<AutoDsmPullRequestListResult, AutoDsmRpcError>;
  readonly prepareSessionBranch: (
    input: AutoDsmGitSessionBranchInput,
  ) => Effect.Effect<AutoDsmGitSessionBranchResult, AutoDsmRpcError>;
  readonly getIssuesForPrompt: (
    input: AutoDsmIssuesForPromptInput,
  ) => Effect.Effect<AutoDsmIssuesForPromptResult, AutoDsmRpcError>;
  readonly listActivity: (
    input: AutoDsmActivityListInput,
  ) => Effect.Effect<AutoDsmActivityListResult, AutoDsmRpcError>;
  readonly listComponentAgents: (
    input: AutoDsmComponentAgentListInput,
  ) => Effect.Effect<AutoDsmComponentAgentListResult, AutoDsmRpcError>;
  readonly registerComponentAgent: (
    input: AutoDsmComponentAgentRegisterInput,
  ) => Effect.Effect<AutoDsmComponentAgentRegisterResult, AutoDsmRpcError>;
  readonly updateComponentAgent: (
    input: AutoDsmComponentAgentUpdateInput,
  ) => Effect.Effect<AutoDsmComponentAgentUpdateResult, AutoDsmRpcError>;
  readonly removeComponentAgent: (
    input: AutoDsmComponentAgentRemoveInput,
  ) => Effect.Effect<AutoDsmComponentAgentRemoveResult, AutoDsmRpcError>;
  readonly resyncComponentAgents: (
    input: AutoDsmComponentAgentResyncInput,
  ) => Effect.Effect<AutoDsmComponentAgentResyncResult, AutoDsmRpcError>;
  readonly getComponentConversation: (
    input: AutoDsmComponentConversationGetInput,
  ) => Effect.Effect<AutoDsmComponentConversationGetResult, AutoDsmRpcError>;
  readonly appendComponentConversation: (
    input: AutoDsmComponentConversationAppendInput,
  ) => Effect.Effect<AutoDsmComponentConversationAppendResult, AutoDsmRpcError>;
  readonly getSession: (
    input: AutoDsmSessionGetInput,
  ) => Effect.Effect<AutoDsmSessionGetResult, AutoDsmRpcError>;
  readonly createSession: (
    input: AutoDsmSessionCreateInput,
  ) => Effect.Effect<AutoDsmSessionCreateResult, AutoDsmRpcError>;
  readonly listChangeSetsForSession: (
    input: AutoDsmSessionChangeSetListInput,
  ) => Effect.Effect<AutoDsmSessionChangeSetListResult, AutoDsmRpcError>;
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
    // TextGeneration is resolved lazily INSIDE `proposeDesignBrief` rather
    // than at layer-construction time. Eager `yield* TextGeneration` here
    // forced this layer's construction context to include
    // `ProviderInstanceRegistry` (TextGeneration.layer's own dependency),
    // which produced a "Service not found" crash on backend boot whenever
    // the wider runtime composition didn't surface ProviderInstanceRegistry
    // at this exact layer node. Resolving it inside the method body defers
    // the lookup until call-time, where the full runtime context is live.

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

    // In-memory cache of pending design-brief proposals, keyed by
    // `${cwd}:${proposalId}`. Proposals are short-lived (≤ 1 hour) and never
    // persisted across server restarts — clients re-propose if they restart.
    const designBriefProposals = new Map<
      string,
      { readonly proposal: AutoDsmDesignBriefProposal; readonly expiresAtMs: number }
    >();
    const DESIGN_BRIEF_PROPOSAL_TTL_MS = 60 * 60 * 1000;

    const pruneExpiredProposals = (): void => {
      const now = Date.now();
      for (const [key, entry] of designBriefProposals) {
        if (entry.expiresAtMs <= now) {
          designBriefProposals.delete(key);
        }
      }
    };

    const uploadDesignBriefEffect = (input: AutoDsmDesignBriefUploadInput) =>
      Effect.try({
        try: () => ({ doc: writeDesignBrief(input.cwd, input.markdown) }),
        catch: (cause) =>
          new AutoDsmRpcError({
            message: cause instanceof Error ? cause.message : "Failed to upload design brief",
            cause,
          }),
      });

    const proposeDesignBriefEffect = (input: AutoDsmDesignBriefProposeInput) =>
      Effect.gen(function* () {
        // Resolved lazily here (not at layer construction) so TextGeneration's
        // own ProviderInstanceRegistry dependency is satisfied by the runtime
        // context at call time, not at AutoDsmWorkspaceLive boot.
        const textGeneration = yield* TextGeneration;
        pruneExpiredProposals();
        const loaded = loadDesignBrief(input.cwd);
        if (!loaded) {
          return yield* new AutoDsmRpcError({
            message:
              "No design brief has been uploaded for this workspace. Upload a `design.md` first.",
          });
        }
        const profile = yield* Effect.try({
          try: () => loadBrandProfile(input.cwd),
          catch: (cause) =>
            new AutoDsmRpcError({
              message: cause instanceof Error ? cause.message : "Failed to load brand profile",
              cause,
            }),
        });
        const proposal = yield* proposeFromBrief({
          cwd: input.cwd,
          markdown: loaded.markdown,
          profile,
          generate: makeDesignBriefGenerateFromTextGeneration(textGeneration, input.modelSelection),
        });
        designBriefProposals.set(`${input.cwd}:${proposal.proposalId}`, {
          proposal,
          expiresAtMs: Date.now() + DESIGN_BRIEF_PROPOSAL_TTL_MS,
        });
        return { proposal };
      });

    const applyDesignBriefProposalEffect = (input: AutoDsmDesignBriefApplyInput) =>
      Effect.gen(function* () {
        pruneExpiredProposals();
        const cacheKey = `${input.cwd}:${input.proposalId}`;
        const cached = designBriefProposals.get(cacheKey);
        if (!cached) {
          return yield* new AutoDsmRpcError({
            message:
              "Design brief proposal expired or unknown. Generate a new proposal and try again.",
          });
        }
        const acceptedSet = new Set(input.acceptedOpIds);
        return yield* Effect.try({
          try: () =>
            applyProposal({
              cwd: input.cwd,
              proposal: cached.proposal,
              acceptedOpIds: acceptedSet,
            }),
          catch: (cause) =>
            new AutoDsmRpcError({
              message:
                cause instanceof Error ? cause.message : "Failed to apply design brief proposal",
              cause,
            }),
        });
      });

    const getDesignBriefEffect = (input: AutoDsmCwdInput) =>
      Effect.try({
        try: (): AutoDsmDesignBriefGetResult => {
          const loaded = loadDesignBrief(input.cwd);
          return loaded ? { doc: loaded.doc, markdown: loaded.markdown } : {};
        },
        catch: (cause) =>
          new AutoDsmRpcError({
            message: cause instanceof Error ? cause.message : "Failed to read design brief",
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

    const installIconLibraryEffect = (input: AutoDsmInstallIconLibraryInput) =>
      Effect.try({
        try: () => ({ profile: installIconLibrary(input.cwd, input.library) }),
        catch: (cause) =>
          new AutoDsmRpcError({
            message: cause instanceof Error ? cause.message : "Failed to install icon library",
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
        const registryStartedAtMs = Date.now();

        if (isWorkspaceCwdInsideStagingDirectory(input.cwd)) {
          return yield* new AutoDsmRpcError({
            message: `Workspace path lives in the staging directory (${input.cwd}); reload the app to refresh the workspace list.`,
          });
        }

        // Short-circuit when the cwd doesn't look like a real workspace. Without
        // this gate the registry indexer happily runs against e.g. a stale
        // .staging/<id>/system/ path the frontend is still holding from a
        // crashed creation flow, returning entries:[] with status:"partial".
        // That fed the UI an empty-but-success registry, hid the underlying
        // "wrong cwd" cause, and let the analyzer's previous unconditional
        // ensureViteWorkspaceScaffold call recreate phantom files inside the
        // swept-empty staging directory.
        if (!existsSync(path.join(input.cwd, "package.json"))) {
          const notInitializedRegistry: AutoDsmComponentRegistry = {
            meta: {
              kind: "component-registry",
              schemaVersion: 1,
              owner: "component-registry-indexer",
              invalidationKey: sha256Hex(`${input.cwd}:workspace_not_initialized`),
              consumers: ["workbench-ui", "render-runtime", "scanner", "agent-supervisor"],
            },
            entries: [],
            status: "failed",
            gate: {
              code: "workspace_not_initialized",
              summary: `Workspace at ${input.cwd} is not initialized (package.json missing). Re-create the workspace or pick another one from the sidebar.`,
              commandDisplay: null,
              stdoutTail: null,
              stderrTail: null,
              exitCode: null,
            },
          };
          // eslint-disable-next-line no-console
          console.info("[component-preview] registry-not-initialized", {
            cwd: input.cwd,
            durationMs: Date.now() - registryStartedAtMs,
          });
          return notInitializedRegistry;
        }

        const workspaceEntries = yield* WorkspaceEntries;
        const workspacePaths = yield* WorkspacePaths;
        const workspaceFileSystem = yield* WorkspaceFileSystem;
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

        // Resolve every workspace-relative path first so we can hand the
        // whole batch to `analyzeReactComponentBatch` and reuse a single
        // ts.Program (loading lib.d.ts once, not 49 times).
        type ResolvedEntry = {
          readonly relativePath: string;
          readonly absolutePath: string;
          readonly registryRelativePath: string;
        };
        const resolvedFiles = yield* Effect.forEach(
          componentFiles,
          (entry) =>
            Effect.gen(function* () {
              const relativePath = entry.path.replace(/\\/g, "/");
              if (!isWorkspaceSrcComponentsUiRelativePath(relativePath)) {
                return null as ResolvedEntry | null;
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
              const out: ResolvedEntry = {
                relativePath: resolved.relativePath,
                absolutePath: resolved.absolutePath,
                registryRelativePath: relativePath.startsWith("/")
                  ? relativePath
                  : `/${relativePath}`,
              };
              return out;
            }),
          { concurrency: 4 },
        );

        const resolved = resolvedFiles.filter((r): r is ResolvedEntry => r !== null);

        const analyzeStartedAtMs = Date.now();
        const manifests = analyzeReactComponentBatch({
          cwd: input.cwd,
          files: resolved.map((r) => ({
            absolutePath: r.absolutePath,
            relativePathPosix: r.relativePath,
          })),
        });
        // eslint-disable-next-line no-console
        console.info("[component-preview] registry-batch-analyzed", {
          cwd: input.cwd,
          fileCount: resolved.length,
          durationMs: Date.now() - analyzeStartedAtMs,
        });

        // Scan each component's source for `var(--token)` references so the
        // Design Tokens workspace can show how many components use each token.
        // A failed/oversized read just yields no references for that component.
        const tokenRefsByRelativePath = new Map<string, readonly string[]>();
        yield* Effect.forEach(
          resolved,
          (r) =>
            workspaceFileSystem
              .readFile({
                cwd: input.cwd,
                relativePath: r.relativePath.replace(/\\/g, "/").replace(/^\//, ""),
              })
              .pipe(
                Effect.map((read) => {
                  tokenRefsByRelativePath.set(
                    r.registryRelativePath,
                    extractCssVarTokenNames(read.contents),
                  );
                }),
                Effect.orElseSucceed(() => undefined),
              ),
          { concurrency: 4 },
        );

        const entries: AutoDsmComponentRegistryEntry[] = resolved.map((r, idx) => {
          const manifest = manifests[idx]!;
          const tokenReferences = tokenRefsByRelativePath.get(r.registryRelativePath) ?? [];
          const entryId = AutoDsmRegistryEntryId.make(
            sha256Hex(`${r.relativePath}:${manifest.exports.map((e) => e.name).join(",")}`),
          );
          const componentId = AutoDsmComponentId.make(sha256Hex(`${r.relativePath}:component`));
          const propsByExport: Record<string, (typeof manifest.propsByExport)[number]["props"]> =
            {};
          for (const row of manifest.propsByExport) {
            propsByExport[row.exportName] = [...row.props];
          }
          return {
            id: entryId,
            componentId,
            relativePath: r.registryRelativePath,
            exports: [...manifest.exports],
            propsByExport,
            slotShape: undefined,
            providerHints: [],
            dependencyEdges: [],
            usageImports: {},
            tokenReferences: [...tokenReferences],
            manifest,
          };
        });

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

        yield* Effect.sync(() => {
          reconcileComponentIdsFromRegistry(
            input.cwd,
            entries.map((entry) => ({
              componentId: entry.componentId,
              relativePath: entry.relativePath,
            })),
          );
        });

        // eslint-disable-next-line no-console
        console.info("[component-preview] registry-indexed", {
          cwd: input.cwd,
          fileCount: componentFiles.length,
          entryCount: entries.length,
          status,
          durationMs: Date.now() - registryStartedAtMs,
        });

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
        if (isWorkspaceCwdInsideStagingDirectory(input.cwd)) {
          return yield* new AutoDsmRpcError({
            message: `Workspace path lives in the staging directory (${input.cwd}); reload the app to refresh the workspace list.`,
          });
        }

        const workspaceFileSystem = yield* WorkspaceFileSystem;
        const startedAtMs = Date.now();

        // Kick the sidecar boot off in parallel with the bundle. The bundle
        // doesn't read the sidecar's origin — `peekAutodsmPreviewSidecar`
        // only feeds it into the plan metadata at the end. So we don't need
        // to block bundling on Vite's `createServer({...}).listen()`, which
        // can take 10s+ on a fresh shadcn workspace with ~30 deps and used
        // to leave the iframe stuck on the "Waiting for component bundle…"
        // spinner.
        const sidecarStartedAt = Date.now();
        let sidecarStartupError: string | null = null;
        const sidecarPromise = startAutodsmPreviewSidecar(input.cwd).catch(
          (cause: unknown): null => {
            sidecarStartupError =
              cause instanceof Error ? `${cause.name}: ${cause.message}` : String(cause);
            return null;
          },
        );

        const profile = yield* getProjectProfile({ cwd: input.cwd });
        const rep = yield* getRenderEnvironmentProfile({ cwd: input.cwd });
        const css = detectCssPreviewEntryCandidates(input.cwd);

        const target = yield* locateRegistryPreviewTarget(input);

        const bundlingStarted = Date.now();
        // eslint-disable-next-line no-console
        console.info("[component-preview] execute-render-plan-bundle-start", {
          cwd: input.cwd,
          relativePath: target.hit.relativePath,
          exportName: input.exportName,
        });
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
        }).pipe(
          Effect.timeout("30 seconds"),
          Effect.catchCause((cause) =>
            Effect.succeed<ProjectBuildComponentPreviewResult>({
              ok: false,
              javascript: undefined,
              warnings: [],
              errors: [`bundleComponentPreview timed out: ${Cause.pretty(cause)}`],
            }),
          ),
        );

        const bundleFinished = Date.now();
        const elapsedBundle = Math.max(0, bundleFinished - bundlingStarted);

        // The bundle is done — now give the sidecar up to 5 more seconds so
        // its origin can ride along on the plan metadata. If it still isn't
        // ready, ship the plan without it and surface the elapsed time as a
        // diagnostic. The previous code awaited the sidecar up-front with a
        // 30s budget, which is what produced the indefinite spinner the
        // user was hitting.
        const sidecarDeadline = 5_000;
        const sidecarRace = yield* Effect.promise(
          (): Promise<"settled" | "timeout"> =>
            Promise.race([
              sidecarPromise.then(() => "settled" as const),
              new Promise<"timeout">((resolve) =>
                setTimeout(() => resolve("timeout"), sidecarDeadline),
              ),
            ]),
        );
        const sidecarElapsedMs = Math.max(0, Date.now() - sidecarStartedAt);
        if (sidecarRace === "timeout" && sidecarStartupError === null) {
          sidecarStartupError = `still booting after ${sidecarElapsedMs}ms`;
        }
        const peek = peekAutodsmPreviewSidecar(input.cwd);
        // eslint-disable-next-line no-console
        console.info("[component-preview] sidecar-status", {
          cwd: input.cwd,
          race: sidecarRace,
          sidecarElapsedMs,
          sidecarStartupError,
          hasOrigin: peek?.origin !== undefined,
        });

        const plan = finalizeRenderPlan({
          input,
          target,
          profile,
          rep,
          sidecarPeekOrigin: peek?.origin,
          cssEntryRelativePaths: css,
        });

        const diagnostics: AutoDsmRenderDiagnosticsEntry[] = [];
        let nextAt = bundleFinished;
        if (sidecarStartupError !== null) {
          diagnostics.push({
            level: "error",
            source: "sidecar",
            message: `Preview sidecar failed to start after ${sidecarElapsedMs}ms: ${sidecarStartupError}`,
            atMs: nextAt++,
          });
        }
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

        if (bundled.ok) {
          const renderedAt = assembledAtIso;
          yield* Effect.sync(() => {
            const agent = findComponentAgentByComponentPath(input.cwd, plan.componentRelativePath);
            if (agent) {
              updateComponentAgentRecord({
                cwd: input.cwd,
                threadId: agent.threadId,
                componentId: plan.componentId,
                lastRenderedAt: renderedAt,
                status: "active",
              });
            }
            appendWorkspaceActivity({
              cwd: input.cwd,
              kind: "component.rendered",
              summary: `Rendered ${plan.componentRelativePath}`,
              payload: {
                componentId: plan.componentId,
                renderManifestId: manifestId,
                componentPath: plan.componentRelativePath,
              },
              createdAt: renderedAt,
            });
          });
        }

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
          ...(input.hunks && input.hunks.length > 0 ? { hunks: [...input.hunks] } : {}),
          createdAt,
        };

        yield* Ref.update(changeSets, (m) => new Map(m).set(id, changeSet));
        yield* Effect.sync(() => {
          const sessionId = resolveSessionIdForChangeSet(input.cwd, input.threadId);
          if (sessionId) {
            persistChangeSet({ cwd: input.cwd, sessionId, changeSet });
            appendChangeSetToSessionManifest(input.cwd, sessionId, id);
          }
          appendWorkspaceActivity({
            cwd: input.cwd,
            kind: "changeset.created",
            summary: `ChangeSet ${id} created`,
            payload: { changeSetId: id, threadId: input.threadId ?? null },
            createdAt,
          });
        });
        yield* emitChangeSetActivity({
          threadId: input.threadId,
          changeSetId: id,
          phase: "created",
        });

        return { changeSet };
      });

    const loadChangeSet = (input: {
      readonly cwd: string;
      readonly changeSetId: AutoDsmChangeSetId;
      readonly threadId?: ThreadId;
    }) =>
      Effect.gen(function* () {
        const map = yield* Ref.get(changeSets);
        const cached = map.get(input.changeSetId);
        if (cached) {
          return cached;
        }
        const hydrated = yield* Effect.sync(() =>
          hydrateChangeSetFromDisk(input.cwd, input.changeSetId, input.threadId),
        );
        if (hydrated) {
          yield* Ref.update(changeSets, (m) => new Map(m).set(input.changeSetId, hydrated));
          return hydrated;
        }
        return yield* new AutoDsmRpcError({ message: `Unknown ChangeSet ${input.changeSetId}` });
      });

    const changeSetPreview = (input: AutoDsmChangeSetIdInput) =>
      Effect.gen(function* () {
        const workspaceFileSystem = yield* WorkspaceFileSystem;
        const changeSet = yield* loadChangeSet({
          cwd: input.cwd,
          changeSetId: input.changeSetId,
          ...(input.threadId !== undefined ? { threadId: input.threadId } : {}),
        });
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
        const changeSet = yield* loadChangeSet({
          cwd: input.cwd,
          changeSetId: input.changeSetId,
          ...(input.threadId !== undefined ? { threadId: input.threadId } : {}),
        });
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

        yield* Effect.sync(() => {
          appendWorkspaceActivity({
            cwd: input.cwd,
            kind: "changeset.applied",
            summary: `ChangeSet ${input.changeSetId} applied`,
            payload: { changeSetId: input.changeSetId, threadId: input.threadId ?? null },
            createdAt: recordedAt,
          });
          if (input.threadId) {
            updateComponentAgentRecord({
              cwd: input.cwd,
              threadId: input.threadId,
              status: "active",
            });
          }
          for (const op of changeSet.ops) {
            const normalized = op.path.replace(/\\/g, "/");
            const componentPath = normalized.startsWith("/") ? normalized : `/${normalized}`;
            if (!componentPath.includes("/src/components/")) {
              continue;
            }
            const agent = findComponentAgentByComponentPath(input.cwd, componentPath);
            if (agent && input.threadId && agent.threadId === input.threadId) {
              updateComponentAgentRecord({
                cwd: input.cwd,
                threadId: input.threadId,
                status: "active",
              });
            }
          }
        });

        return { changeSet, outcome };
      });

    const changeSetRollback = (input: AutoDsmChangeSetIdInput) =>
      Effect.gen(function* () {
        const changeSet = yield* loadChangeSet({
          cwd: input.cwd,
          changeSetId: input.changeSetId,
          ...(input.threadId !== undefined ? { threadId: input.threadId } : {}),
        });
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

    // --- Hunk-level diff review (Phase 9) -----------------------------------
    // The agent writes files directly to the worktree; the turn diff is the
    // record of those edits. `changeSetCreateFromTurnDiff` captures that diff as
    // a reviewable ChangeSet (ops + per-hunk records), `...SetHunkDecisions`
    // records approve/reject/discard per hunk, and `...ApplyDecisions` reverts
    // the rejected/discarded hunks back to their pre-turn content.

    const changeSetCreateFromTurnDiff = (input: AutoDsmChangeSetFromTurnDiffInput) =>
      Effect.gen(function* () {
        const { ops, hunks } = deriveChangeSetOpsAndHunks(input.diff);
        return yield* changeSetCreate({
          cwd: input.cwd,
          ops,
          hunks,
          threadId: input.threadId,
        });
      });

    const changeSetSetHunkDecisions = (input: AutoDsmChangeSetHunkDecisionInput) =>
      Effect.gen(function* () {
        const changeSet = yield* loadChangeSet({
          cwd: input.cwd,
          changeSetId: input.changeSetId,
          ...(input.threadId !== undefined ? { threadId: input.threadId } : {}),
        });
        const decisionById = new Map(input.decisions.map((d) => [d.hunkId, d.decision]));
        const nextHunks = (changeSet.hunks ?? []).map((hunk) =>
          decisionById.has(hunk.id) ? { ...hunk, decision: decisionById.get(hunk.id)! } : hunk,
        );
        const nextChangeSet: AutoDsmChangeSet = { ...changeSet, hunks: nextHunks };

        yield* Ref.update(changeSets, (m) => new Map(m).set(nextChangeSet.id, nextChangeSet));
        const recordedAt = yield* Effect.map(DateTime.now, DateTime.formatIso);
        yield* Effect.sync(() => {
          const sessionId = resolveSessionIdForChangeSet(input.cwd, input.threadId);
          if (sessionId) {
            persistChangeSet({ cwd: input.cwd, sessionId, changeSet: nextChangeSet });
          }
          const summary = summarizeDecisions(nextHunks);
          appendWorkspaceActivity({
            cwd: input.cwd,
            kind: "changeset.hunk-decided",
            summary: `ChangeSet ${nextChangeSet.id} hunk decisions updated (${summary})`,
            payload: {
              changeSetId: nextChangeSet.id,
              threadId: input.threadId ?? null,
              approved: nextHunks.filter((h) => h.decision === "approved").length,
              rejected: nextHunks.filter(
                (h) => h.decision === "rejected" || h.decision === "discarded",
              ).length,
              pending: nextHunks.filter((h) => h.decision === "pending").length,
            },
            createdAt: recordedAt,
          });
        });

        return { changeSet: nextChangeSet };
      });

    const changeSetApplyDecisions = (input: AutoDsmChangeSetIdInput) =>
      Effect.gen(function* () {
        const workspaceFileSystem = yield* WorkspaceFileSystem;
        const changeSet = yield* loadChangeSet({
          cwd: input.cwd,
          changeSetId: input.changeSetId,
          ...(input.threadId !== undefined ? { threadId: input.threadId } : {}),
        });
        const hunks = changeSet.hunks ?? [];

        // Group hunks by file; revert files that contain rejected/discarded hunks.
        const byFile = new Map<string, AutoDsmChangeHunk[]>();
        for (const hunk of hunks) {
          const list = byFile.get(hunk.filePath) ?? [];
          list.push(hunk);
          byFile.set(hunk.filePath, list);
        }

        for (const [filePath, fileHunks] of byFile) {
          const needsRevert = fileHunks.some(
            (h) => h.decision === "rejected" || h.decision === "discarded",
          );
          if (!needsRevert) {
            continue;
          }
          const rp = filePath.replace(/\\/g, "/").replace(/^\//, "");
          const afterContent = yield* workspaceFileSystem
            .readFile({ cwd: input.cwd, relativePath: rp })
            .pipe(
              Effect.map((r) => r.contents),
              Effect.orElseSucceed(() => ""),
            );
          const reconstructed = reconstructFileWithDecisions(afterContent, fileHunks);
          if (reconstructed !== afterContent) {
            yield* applyOp(input.cwd, { kind: "update", path: filePath, contents: reconstructed });
          }
        }

        const disposition = ((): AutoDsmEditOutcome["disposition"] => {
          const summary = summarizeDecisions(hunks);
          if (summary === "rejected") return "reverted";
          if (summary === "mixed") return "partial";
          return "accepted";
        })();

        const recordedAt = yield* Effect.map(DateTime.now, DateTime.formatIso);
        const outcome: AutoDsmEditOutcome = {
          changeSetId: input.changeSetId,
          disposition,
          affectedComponentIds: [],
          recordedAt,
        };

        yield* emitChangeSetActivity({
          threadId: input.threadId,
          changeSetId: input.changeSetId,
          phase: "applied",
        });
        yield* Effect.sync(() => {
          appendWorkspaceActivity({
            cwd: input.cwd,
            kind: "changeset.applied",
            summary: `ChangeSet ${input.changeSetId} applied (${disposition})`,
            payload: {
              changeSetId: input.changeSetId,
              threadId: input.threadId ?? null,
              disposition,
            },
            createdAt: recordedAt,
          });
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

    const listActivity = (input: AutoDsmActivityListInput) =>
      Effect.sync(() =>
        listWorkspaceActivity({
          cwd: input.cwd,
          ...(input.limit !== undefined ? { limit: input.limit } : {}),
        }),
      );

    const listComponentAgents = (input: AutoDsmComponentAgentListInput) =>
      Effect.sync(() => ({ manifest: loadComponentAgentsManifest(input.cwd) }));

    const registerComponentAgent = (input: AutoDsmComponentAgentRegisterInput) =>
      Effect.gen(function* () {
        const createdAt = yield* Effect.map(DateTime.now, DateTime.formatIso);
        const result = yield* Effect.sync(() => registerComponentAgentRecord(input));
        yield* Effect.sync(() => {
          appendWorkspaceActivity({
            cwd: input.cwd,
            kind: "component.created",
            summary: `Component agent registered for ${input.componentPath}`,
            payload: {
              threadId: input.threadId,
              componentPath: input.componentPath,
              sessionId: result.session.sessionId,
            },
            createdAt,
          });
          appendWorkspaceActivity({
            cwd: input.cwd,
            kind: "session.started",
            summary: `Session ${result.session.sessionId} started`,
            payload: {
              sessionId: result.session.sessionId,
              threadId: input.threadId,
              componentPath: input.componentPath,
            },
            createdAt,
          });
        });
        return result;
      });

    const updateComponentAgent = (input: AutoDsmComponentAgentUpdateInput) =>
      Effect.try({
        try: () => ({ agent: updateComponentAgentRecord(input) }),
        catch: (cause) =>
          new AutoDsmRpcError({
            message: cause instanceof Error ? cause.message : "Failed to update component agent",
            cause,
          }),
      });

    const removeComponentAgent = (input: AutoDsmComponentAgentRemoveInput) =>
      Effect.sync(() => removeComponentAgentRecord(input));

    const resyncComponentAgentsEffect = (input: AutoDsmComponentAgentResyncInput) =>
      Effect.try({
        try: () =>
          resyncComponentAgentsFromTemplate({
            cwd: input.cwd,
            ...(input.mode ? { mode: input.mode } : {}),
          }),
        catch: (cause) =>
          new AutoDsmRpcError({
            message:
              cause instanceof Error
                ? cause.message
                : "Failed to resync component agents from template",
            cause,
          }),
      });

    const getComponentConversation = (input: AutoDsmComponentConversationGetInput) =>
      Effect.sync(() => ({
        conversation: loadComponentConversation(input.cwd, input.componentPath),
      }));

    const appendComponentConversationHandler = (input: AutoDsmComponentConversationAppendInput) =>
      Effect.sync(() => ({ conversation: appendComponentConversation(input) }));

    const getSession = (input: AutoDsmSessionGetInput) =>
      Effect.sync(() => ({ session: loadSession(input.cwd, input.sessionId) }));

    const createSessionHandler = (input: AutoDsmSessionCreateInput) =>
      Effect.sync(() => ({ session: createSession(input) }));

    const listChangeSetsForSession = (input: AutoDsmSessionChangeSetListInput) =>
      Effect.sync(() => ({
        changeSets: listPersistedChangeSetsForSession(input.cwd, input.sessionId),
      }));

    const exportPublishedExportHandler = (input: AutoDsmPublishedExportInput) =>
      Effect.sync(() => ({ publishedExport: exportPublishedExport(input) }));

    const createPullRequestHandler = (input: AutoDsmPullRequestCreateInput) =>
      Effect.gen(function* () {
        const createdAt = yield* Effect.map(DateTime.now, DateTime.formatIso);
        const pullRequest = yield* Effect.sync(() => createPullRequest(input));
        yield* Effect.sync(() => {
          appendWorkspaceActivity({
            cwd: input.cwd,
            kind: "pullrequest.created",
            summary: `Pull request ${pullRequest.title}`,
            payload: {
              pullRequestId: pullRequest.id,
              changeSetIds: pullRequest.changeSetIds,
            },
            createdAt,
          });
        });
        return { pullRequest };
      });

    const listPullRequestsHandler = (input: AutoDsmPullRequestListInput) =>
      Effect.sync(() => listPullRequests(input.cwd));

    // Eagerly run the workspace build (typically a no-op skip for shadcn-style
    // starters, a real build for ones with scripts.build) so the first preview
    // click doesn't pay the cost lazily. resolveWorkspaceBuild caches by
    // invalidation hash, so subsequent getComponentRegistry calls return
    // immediately. If the build itself fails, we still return the materialized
    // workspace and let the registry surface the gate to the UI — the user can
    // then retry via the new registry-error panel in WebContentsView.
    const createWorkspace = (input: AutoDsmCreateWorkspaceInput) =>
      Effect.gen(function* () {
        const result = yield* autodsmMaterializeWorkspace(input);
        const startedAt = Date.now();
        yield* Effect.logInfo("autodsm.createWorkspace", {
          phase: "workspace-build-warmup-start",
          workspaceId: result.workspaceId,
          cwd: result.cwd,
        });
        yield* runWorkspaceBuild({ cwd: result.cwd, force: false }).pipe(
          Effect.tap((buildResult) =>
            Effect.logInfo("autodsm.createWorkspace", {
              phase: "workspace-build-warmup-complete",
              workspaceId: result.workspaceId,
              ok: buildResult.ok,
              skipped: buildResult.skipped,
              elapsedMs: Date.now() - startedAt,
            }),
          ),
          Effect.catch((cause) =>
            Effect.logWarning("autodsm.createWorkspace", {
              phase: "workspace-build-warmup-failed",
              workspaceId: result.workspaceId,
              elapsedMs: Date.now() - startedAt,
              cause: cause instanceof Error ? cause.message : String(cause),
            }),
          ),
        );
        return result;
      });
    const listWorkspaceHistory = listAutodsmWorkspaceHistoryFromDisk;
    const deleteWorkspace = autodsmDeleteWorkspaceFromDisk;

    return {
      createWorkspace,
      listWorkspaceHistory,
      deleteWorkspace,
      getProjectProfile,
      getBrandProfile,
      addBrandToken: addBrandTokenEffect,
      removeBrandToken: removeBrandTokenEffect,
      updateBrandToken: updateBrandTokenEffect,
      uploadDesignBrief: uploadDesignBriefEffect,
      proposeDesignBrief: proposeDesignBriefEffect,
      applyDesignBriefProposal: applyDesignBriefProposalEffect,
      getDesignBrief: getDesignBriefEffect,
      resyncBrandTokens: resyncBrandTokensEffect,
      installIconLibrary: installIconLibraryEffect,
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
      changeSetCreateFromTurnDiff,
      changeSetSetHunkDecisions,
      changeSetApplyDecisions,
      assembleGenerationPlan,
      exportPublishedSnapshot,
      exportPublishedExport: exportPublishedExportHandler,
      createPullRequest: createPullRequestHandler,
      listPullRequests: listPullRequestsHandler,
      prepareSessionBranch,
      getIssuesForPrompt,
      listActivity,
      listComponentAgents,
      registerComponentAgent,
      updateComponentAgent,
      removeComponentAgent,
      resyncComponentAgents: resyncComponentAgentsEffect,
      getComponentConversation,
      appendComponentConversation: appendComponentConversationHandler,
      getSession,
      createSession: createSessionHandler,
      listChangeSetsForSession,
    } as unknown as AutoDsmWorkspaceShape;
  }),
);
