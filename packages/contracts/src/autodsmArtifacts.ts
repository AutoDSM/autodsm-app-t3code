/**
 * AutoDSM canonical artifacts — typed payloads that cross process boundaries.
 *
 * Each persisted artifact should carry {@link AutoDsmArtifactMeta}: owner,
 * deterministic invalidation key, schema version, and declared consumers.
 *
 * @module autodsmArtifacts
 */
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import {
  AutoDsmChangeSetId,
  AutoDsmActivityEntryId,
  AutoDsmComponentId,
  AutoDsmGenerationPlanId,
  AutoDsmPullRequestId,
  AutoDsmPublishedExportId,
  AutoDsmPublishedSnapshotId,
  AutoDsmRegistryEntryId,
  AutoDsmRenderManifestId,
  AutoDsmRenderPlanId,
  AutoDsmScanArtifactId,
  AutoDsmSessionId,
  EnvironmentId,
  IsoDateTime,
  NonNegativeInt,
  PositiveInt,
  ProjectId,
  ThreadId,
  TrimmedNonEmptyString,
  TrimmedString,
  TurnId,
} from "./baseSchemas.ts";
import {
  ComponentPreviewExportSpec,
  ComponentPreviewManifest,
  ComponentPreviewPropSpec,
} from "./project.ts";

export const AutoDsmArtifactOwnerSchema = Schema.Literals([
  "project-profile-indexer",
  "brand-profile-indexer",
  "component-registry-indexer",
  "workspace-build-validator",
  "render-runtime",
  "scanner-worker",
  "changeset-service",
  "agent-supervisor",
  "publish-service",
  "pr-service",
  "activity-log",
]);
export type AutoDsmArtifactOwner = typeof AutoDsmArtifactOwnerSchema.Type;

export const AutoDsmArtifactMeta = Schema.Struct({
  kind: TrimmedNonEmptyString,
  schemaVersion: Schema.Int,
  owner: AutoDsmArtifactOwnerSchema,
  /** Deterministic cache key for this artifact revision. */
  invalidationKey: TrimmedNonEmptyString,
  consumers: Schema.Array(TrimmedNonEmptyString),
});
export type AutoDsmArtifactMeta = typeof AutoDsmArtifactMeta.Type;

export const AutoDsmWorkspaceRelativePath = TrimmedNonEmptyString;
export type AutoDsmWorkspaceRelativePath = typeof AutoDsmWorkspaceRelativePath.Type;

/** Indexing lifecycle for registry/profile surfaces. */
export const AutoDsmIndexStatusSchema = Schema.Literals([
  "not_started",
  "indexing",
  "ready",
  "stale",
  "failed",
  "partial",
]);
export type AutoDsmIndexStatus = typeof AutoDsmIndexStatusSchema.Type;

export const AutoDsmIndexingProgressEvent = Schema.Struct({
  cwd: TrimmedNonEmptyString,
  status: AutoDsmIndexStatusSchema,
  phase: TrimmedNonEmptyString,
  processed: NonNegativeInt,
  total: Schema.optional(NonNegativeInt),
  message: Schema.optional(TrimmedString),
});
export type AutoDsmIndexingProgressEvent = typeof AutoDsmIndexingProgressEvent.Type;

const PackageManagerIdSchema = Schema.Literals(["npm", "pnpm", "yarn", "bun", "unknown"]);

export const AutoDsmProjectProfile = Schema.Struct({
  meta: AutoDsmArtifactMeta,
  workspaceRootFingerprint: TrimmedNonEmptyString,
  packageManager: PackageManagerIdSchema,
  /** Detected frameworks / bundlers (static signals only). */
  frameworks: Schema.Array(TrimmedNonEmptyString),
  monorepoWorkspacePatterns: Schema.Array(TrimmedNonEmptyString),
  typescriptProjectHints: Schema.Array(TrimmedNonEmptyString),
  tailwindHintPaths: Schema.Array(AutoDsmWorkspaceRelativePath),
  componentRoots: Schema.Array(AutoDsmWorkspaceRelativePath),
  packageVersions: Schema.Record(TrimmedNonEmptyString, TrimmedNonEmptyString),
  status: AutoDsmIndexStatusSchema,
});
export type AutoDsmProjectProfile = typeof AutoDsmProjectProfile.Type;

/** Canonical token categories surfaced in the Design Tokens workspace. */
export const AutoDsmBrandTokenCategorySchema = Schema.Literals([
  "color",
  "typography",
  "spacing",
  "motion",
]);
export type AutoDsmBrandTokenCategory = typeof AutoDsmBrandTokenCategorySchema.Type;

/** Where a brand token came from: extracted from the installed system, or user-added. */
export const AutoDsmBrandTokenOriginSchema = Schema.Literals(["scanned", "user"]);
export type AutoDsmBrandTokenOrigin = typeof AutoDsmBrandTokenOriginSchema.Type;

/** Per-theme values for a color token. */
export const AutoDsmColorTokenValue = Schema.Struct({
  light: Schema.optional(TrimmedNonEmptyString),
  dark: Schema.optional(TrimmedNonEmptyString),
});
export type AutoDsmColorTokenValue = typeof AutoDsmColorTokenValue.Type;

/** Structured sub-fields for a typography token. */
export const AutoDsmTypographyTokenValue = Schema.Struct({
  fontFamily: Schema.optional(TrimmedNonEmptyString),
  fontSize: Schema.optional(TrimmedNonEmptyString),
  letterSpacing: Schema.optional(TrimmedNonEmptyString),
  fontWeight: Schema.optional(TrimmedNonEmptyString),
  lineHeight: Schema.optional(TrimmedNonEmptyString),
});
export type AutoDsmTypographyTokenValue = typeof AutoDsmTypographyTokenValue.Type;

export const AutoDsmBrandToken = Schema.Struct({
  id: TrimmedNonEmptyString,
  /** Canonical category; legacy free-form strings are normalized by consumers. */
  category: TrimmedNonEmptyString,
  /** Human-facing label (e.g. `primary/50`); falls back to `id` when absent. */
  name: Schema.optional(TrimmedNonEmptyString),
  /** Canonical/primary value — kept required for existing render/scan/publish consumers. */
  value: TrimmedNonEmptyString,
  /** Per-theme color values when `category` is `color`. */
  color: Schema.optional(AutoDsmColorTokenValue),
  /** Structured typography fields when `category` is `typography`. */
  typography: Schema.optional(AutoDsmTypographyTokenValue),
  /** `scanned` = extracted from the installed system; `user` = added in-app. */
  origin: Schema.optional(AutoDsmBrandTokenOriginSchema),
  sources: Schema.Array(AutoDsmWorkspaceRelativePath),
});
export type AutoDsmBrandToken = typeof AutoDsmBrandToken.Type;

/** Client-supplied fields for a new user token; the server assigns `id`/`origin`. */
export const AutoDsmBrandTokenDraft = Schema.Struct({
  category: AutoDsmBrandTokenCategorySchema,
  name: TrimmedNonEmptyString,
  value: TrimmedNonEmptyString,
  color: Schema.optional(AutoDsmColorTokenValue),
  typography: Schema.optional(AutoDsmTypographyTokenValue),
});
export type AutoDsmBrandTokenDraft = typeof AutoDsmBrandTokenDraft.Type;

export const AutoDsmBrandProfile = Schema.Struct({
  meta: AutoDsmArtifactMeta,
  tokens: Schema.Array(AutoDsmBrandToken),
  cssVariablePaths: Schema.Array(AutoDsmWorkspaceRelativePath),
  status: AutoDsmIndexStatusSchema,
});
export type AutoDsmBrandProfile = typeof AutoDsmBrandProfile.Type;

export const AutoDsmSourceSpan = Schema.Struct({
  start: NonNegativeInt,
  end: NonNegativeInt,
});
export type AutoDsmSourceSpan = typeof AutoDsmSourceSpan.Type;

export const AutoDsmRegistryDependencyEdge = Schema.Struct({
  fromEntryId: AutoDsmRegistryEntryId,
  toEntryId: AutoDsmRegistryEntryId,
  importSpec: TrimmedString,
});
export type AutoDsmRegistryDependencyEdge = typeof AutoDsmRegistryDependencyEdge.Type;

/** Last workspace package build attempt used to gate the component registry. */
export const AutoDsmWorkspaceBuildInput = Schema.Struct({
  cwd: TrimmedNonEmptyString,
  force: Schema.optional(Schema.Boolean),
});
export type AutoDsmWorkspaceBuildInput = typeof AutoDsmWorkspaceBuildInput.Type;

export const AutoDsmWorkspaceBuildResult = Schema.Struct({
  /** True when there was no `scripts.build` to execute. */
  skipped: Schema.Boolean,
  /** True only when a build command ran and exited 0 (not timed out). */
  ok: Schema.Boolean,
  skipReason: Schema.NullOr(TrimmedString),
  commandDisplay: TrimmedString,
  exitCode: Schema.NullOr(Schema.Number),
  timedOut: Schema.Boolean,
  stdoutTail: TrimmedString,
  stderrTail: TrimmedString,
  invalidationKey: TrimmedNonEmptyString,
  workspaceRootFingerprint: TrimmedNonEmptyString,
});
export type AutoDsmWorkspaceBuildResult = typeof AutoDsmWorkspaceBuildResult.Type;

export const AutoDsmComponentRegistryGateReason = Schema.Struct({
  code: Schema.Literals([
    "workspace_build_failed",
    "workspace_build_skipped",
    "workspace_build_timed_out",
    "workspace_build_runner_error",
  ]),
  summary: TrimmedString,
  commandDisplay: Schema.NullOr(TrimmedString),
  stdoutTail: Schema.NullOr(TrimmedString),
  stderrTail: Schema.NullOr(TrimmedString),
  exitCode: Schema.NullOr(Schema.Number),
});
export type AutoDsmComponentRegistryGateReason = typeof AutoDsmComponentRegistryGateReason.Type;

export const AutoDsmComponentRegistryEntry = Schema.Struct({
  id: AutoDsmRegistryEntryId,
  componentId: AutoDsmComponentId,
  relativePath: AutoDsmWorkspaceRelativePath,
  exports: Schema.Array(ComponentPreviewExportSpec),
  propsByExport: Schema.Record(TrimmedNonEmptyString, Schema.Array(ComponentPreviewPropSpec)),
  slotShape: Schema.optional(Schema.Record(TrimmedNonEmptyString, TrimmedString)),
  providerHints: Schema.Array(TrimmedNonEmptyString),
  dependencyEdges: Schema.Array(AutoDsmRegistryDependencyEdge),
  usageImports: Schema.Record(AutoDsmWorkspaceRelativePath, Schema.Array(AutoDsmSourceSpan)),
  manifest: ComponentPreviewManifest,
});
export type AutoDsmComponentRegistryEntry = typeof AutoDsmComponentRegistryEntry.Type;

export const AutoDsmComponentRegistry = Schema.Struct({
  meta: AutoDsmArtifactMeta,
  entries: Schema.Array(AutoDsmComponentRegistryEntry),
  status: AutoDsmIndexStatusSchema,
  /** Present when the catalog is blocked (e.g. workspace build gate). */
  gate: Schema.optional(Schema.NullOr(AutoDsmComponentRegistryGateReason)),
});
export type AutoDsmComponentRegistry = typeof AutoDsmComponentRegistry.Type;

export const ProviderPackIdSchema = TrimmedNonEmptyString;
export type ProviderPackId = typeof ProviderPackIdSchema.Type;

export const ProviderPackLayerSchema = Schema.Literals([
  "theme",
  "i18n",
  "router",
  "data",
  "state",
  "portals",
  "component",
]);

export const AutoDsmRenderEnvironmentProfile = Schema.Struct({
  meta: AutoDsmArtifactMeta,
  detectedPacks: Schema.Array(
    Schema.Struct({
      id: ProviderPackIdSchema,
      layer: ProviderPackLayerSchema,
      reason: TrimmedString,
    }),
  ),
  disabledPackIds: Schema.Array(ProviderPackIdSchema),
  overrideNotes: Schema.Array(TrimmedString),
  envAllowlist: Schema.Array(TrimmedNonEmptyString),
  sidecarVersion: TrimmedNonEmptyString,
});
export type AutoDsmRenderEnvironmentProfile = typeof AutoDsmRenderEnvironmentProfile.Type;

export const AutoDsmViewportSpec = Schema.Struct({
  label: TrimmedNonEmptyString,
  width: PositiveInt,
  height: PositiveInt,
  devicePixelRatio: Schema.optional(Schema.Number),
});
export type AutoDsmViewportSpec = typeof AutoDsmViewportSpec.Type;

/** Declarative mock/stub hook for deterministic preview renders. */
export const AutoDsmPreviewMockDescriptorSchema = Schema.Struct({
  id: TrimmedNonEmptyString,
  kind: TrimmedNonEmptyString,
  descriptorJson: TrimmedString,
});
export type AutoDsmPreviewMockDescriptor = typeof AutoDsmPreviewMockDescriptorSchema.Type;

export const AutoDsmRenderPlan = Schema.Struct({
  id: AutoDsmRenderPlanId,
  meta: AutoDsmArtifactMeta,
  componentId: AutoDsmComponentId,
  /** Registry-relative POSIX component path (`/src/components/…`). */
  componentRelativePath: AutoDsmWorkspaceRelativePath,
  /** Optional specifier used by bundlers that prefer explicit import URLs. */
  componentImportSpecifier: Schema.optional(TrimmedNonEmptyString),
  exportName: TrimmedNonEmptyString,
  propsJson: TrimmedString,
  viewport: AutoDsmViewportSpec,
  theme: TrimmedNonEmptyString,
  deterministicSeed: TrimmedNonEmptyString,
  repInvalidationKey: TrimmedNonEmptyString,
  /** Provider stack order preserved from `detectedPacks`; ids only. */
  providerPackIds: Schema.Array(ProviderPackIdSchema),
  /** Workspace-relative CSS roots to hydrate through the preview runtime. */
  cssEntryRelativePaths: Schema.Array(AutoDsmWorkspaceRelativePath),
  mockDescriptors: Schema.Array(AutoDsmPreviewMockDescriptorSchema),
  /** Loopback URL for sidecar runtime entry (no remote hosts). */
  sidecarOrigin: Schema.optional(TrimmedNonEmptyString),
  /**
   * URL path appended to {@link AutoDsmRenderPlan.sidecarOrigin} for preview HTML
   * (e.g. `/__t3_autodsm/preview/session-id`).
   */
  sidecarPreviewPath: Schema.optional(TrimmedNonEmptyString),
});
export type AutoDsmRenderPlan = typeof AutoDsmRenderPlan.Type;

export const AutoDsmRenderDiagnosticsEntry = Schema.Struct({
  level: Schema.Literals(["log", "warn", "error"]),
  source: TrimmedNonEmptyString,
  message: TrimmedString,
  atMs: NonNegativeInt,
});
export type AutoDsmRenderDiagnosticsEntry = typeof AutoDsmRenderDiagnosticsEntry.Type;

export const AutoDsmRenderManifest = Schema.Struct({
  id: AutoDsmRenderManifestId,
  meta: AutoDsmArtifactMeta,
  planId: AutoDsmRenderPlanId,
  ok: Schema.Boolean,
  cwd: TrimmedNonEmptyString,
  previewSessionId: Schema.optional(TrimmedNonEmptyString),
  previewUrl: Schema.optional(TrimmedNonEmptyString),
  loadedModules: Schema.Array(TrimmedNonEmptyString),
  warnings: Schema.Array(TrimmedString),
  errors: Schema.Array(TrimmedString),
  diagnostics: Schema.Array(AutoDsmRenderDiagnosticsEntry),
  screenshotIds: Schema.Array(TrimmedNonEmptyString),
  timingsMs: Schema.Record(TrimmedNonEmptyString, NonNegativeInt),
  viewportResults: Schema.Array(
    Schema.Struct({
      viewport: AutoDsmViewportSpec,
      ok: Schema.Boolean,
      notes: Schema.Array(TrimmedString),
    }),
  ),
});
export type AutoDsmRenderManifest = typeof AutoDsmRenderManifest.Type;

export const AutoDsmScanViolationSeveritySchema = Schema.Literals(["info", "warn", "error"]);
export type AutoDsmScanViolationSeverity = typeof AutoDsmScanViolationSeveritySchema.Type;

export const AutoDsmScanViolation = Schema.Struct({
  id: TrimmedNonEmptyString,
  severity: AutoDsmScanViolationSeveritySchema,
  ruleId: TrimmedNonEmptyString,
  message: TrimmedString,
  filePath: AutoDsmWorkspaceRelativePath,
  range: Schema.optional(AutoDsmSourceSpan),
  componentId: Schema.optional(AutoDsmComponentId),
  autofixHint: Schema.optional(TrimmedString),
});
export type AutoDsmScanViolation = typeof AutoDsmScanViolation.Type;

export const AutoDsmScanArtifact = Schema.Struct({
  id: AutoDsmScanArtifactId,
  meta: AutoDsmArtifactMeta,
  targetPath: AutoDsmWorkspaceRelativePath,
  componentId: Schema.optional(AutoDsmComponentId),
  renderManifestId: Schema.optional(AutoDsmRenderManifestId),
  violations: Schema.Array(AutoDsmScanViolation),
});
export type AutoDsmScanArtifact = typeof AutoDsmScanArtifact.Type;

export const AutoDsmGenerationPlanSliceRef = Schema.Struct({
  sliceId: TrimmedNonEmptyString,
  summary: TrimmedString,
  budgetChars: NonNegativeInt,
});
export type AutoDsmGenerationPlanSliceRef = typeof AutoDsmGenerationPlanSliceRef.Type;

export const AutoDsmGenerationPlan = Schema.Struct({
  id: AutoDsmGenerationPlanId,
  meta: AutoDsmArtifactMeta,
  threadId: Schema.optional(ThreadId),
  projectId: Schema.optional(ProjectId),
  slices: Schema.Array(AutoDsmGenerationPlanSliceRef),
  proposedChangeSetId: Schema.optional(AutoDsmChangeSetId),
  assembledAt: IsoDateTime,
});
export type AutoDsmGenerationPlan = typeof AutoDsmGenerationPlan.Type;

export const AutoDsmChangeOpKindSchema = Schema.Literals(["create", "update", "delete", "rename"]);

export const AutoDsmChangeOp = Schema.Struct({
  kind: AutoDsmChangeOpKindSchema,
  path: AutoDsmWorkspaceRelativePath,
  beforeHash: Schema.optional(TrimmedNonEmptyString),
  afterHash: Schema.optional(TrimmedNonEmptyString),
  contents: Schema.optional(Schema.String),
  renameTo: Schema.optional(AutoDsmWorkspaceRelativePath),
});
export type AutoDsmChangeOp = typeof AutoDsmChangeOp.Type;

export const AutoDsmChangeSet = Schema.Struct({
  id: AutoDsmChangeSetId,
  meta: AutoDsmArtifactMeta,
  cwd: TrimmedNonEmptyString,
  ops: Schema.Array(AutoDsmChangeOp),
  createdAt: IsoDateTime,
});
export type AutoDsmChangeSet = typeof AutoDsmChangeSet.Type;

export const AutoDsmChangeSetPreviewFile = Schema.Struct({
  path: AutoDsmWorkspaceRelativePath,
  before: Schema.optional(Schema.String),
  after: Schema.optional(Schema.String),
});
export type AutoDsmChangeSetPreviewFile = typeof AutoDsmChangeSetPreviewFile.Type;

export const AutoDsmChangeSetPreview = Schema.Struct({
  changeSetId: AutoDsmChangeSetId,
  files: Schema.Array(AutoDsmChangeSetPreviewFile),
  validationNotes: Schema.Array(TrimmedString),
});
export type AutoDsmChangeSetPreview = typeof AutoDsmChangeSetPreview.Type;

export const AutoDsmChangeSetEventPhaseSchema = Schema.Literals([
  "created",
  "previewed",
  "applied",
  "rolled_back",
]);

export const AutoDsmChangeSetEvent = Schema.Struct({
  changeSetId: AutoDsmChangeSetId,
  phase: AutoDsmChangeSetEventPhaseSchema,
  occurredAt: IsoDateTime,
  summary: TrimmedString,
});
export type AutoDsmChangeSetEvent = typeof AutoDsmChangeSetEvent.Type;

export const AutoDsmEditOutcomeDispositionSchema = Schema.Literals([
  "accepted",
  "reverted",
  "partial",
]);

export const AutoDsmEditOutcome = Schema.Struct({
  changeSetId: AutoDsmChangeSetId,
  disposition: AutoDsmEditOutcomeDispositionSchema,
  sessionBranch: Schema.optional(TrimmedNonEmptyString),
  appliedCommitSha: Schema.optional(TrimmedNonEmptyString),
  scanDeltaSummary: Schema.optional(TrimmedString),
  manifestDeltaSummary: Schema.optional(TrimmedString),
  affectedComponentIds: Schema.Array(AutoDsmComponentId),
  recordedAt: IsoDateTime,
});
export type AutoDsmEditOutcome = typeof AutoDsmEditOutcome.Type;

export const AutoDsmChangeHunkDecisionSchema = Schema.Literals([
  "pending",
  "approved",
  "rejected",
  "discarded",
]);
export type AutoDsmChangeHunkDecision = typeof AutoDsmChangeHunkDecisionSchema.Type;

export const AutoDsmChangeHunk = Schema.Struct({
  id: TrimmedNonEmptyString,
  filePath: AutoDsmWorkspaceRelativePath,
  oldStart: NonNegativeInt,
  oldLines: NonNegativeInt,
  newStart: NonNegativeInt,
  newLines: NonNegativeInt,
  patch: Schema.String,
  decision: AutoDsmChangeHunkDecisionSchema,
});
export type AutoDsmChangeHunk = typeof AutoDsmChangeHunk.Type;

export const AutoDsmActivityEntry = Schema.Struct({
  id: AutoDsmActivityEntryId,
  workspaceId: TrimmedNonEmptyString,
  kind: TrimmedNonEmptyString,
  summary: TrimmedString,
  payloadJson: TrimmedString,
  createdAt: IsoDateTime,
});
export type AutoDsmActivityEntry = typeof AutoDsmActivityEntry.Type;

export const AutoDsmPullRequestStatusSchema = Schema.Literals(["draft", "open", "closed"]);
export type AutoDsmPullRequestStatus = typeof AutoDsmPullRequestStatusSchema.Type;

export const AutoDsmPullRequest = Schema.Struct({
  id: AutoDsmPullRequestId,
  workspaceId: TrimmedNonEmptyString,
  cwd: TrimmedNonEmptyString,
  title: TrimmedNonEmptyString,
  summary: TrimmedString,
  status: AutoDsmPullRequestStatusSchema,
  changeSetIds: Schema.Array(AutoDsmChangeSetId),
  files: Schema.Array(AutoDsmWorkspaceRelativePath),
  createdAt: IsoDateTime,
});
export type AutoDsmPullRequest = typeof AutoDsmPullRequest.Type;

export const AutoDsmPublishedSnapshot = Schema.Struct({
  id: AutoDsmPublishedSnapshotId,
  meta: AutoDsmArtifactMeta,
  brandProfile: AutoDsmBrandProfile,
  registrySlice: Schema.Array(AutoDsmComponentRegistryEntry),
  manifests: Schema.Array(AutoDsmRenderManifest),
  assetHashes: Schema.Record(TrimmedNonEmptyString, TrimmedNonEmptyString),
  exportedAt: IsoDateTime,
});
export type AutoDsmPublishedSnapshot = typeof AutoDsmPublishedSnapshot.Type;

export const AutoDsmPublishedExport = Schema.Struct({
  id: AutoDsmPublishedExportId,
  workspaceId: TrimmedNonEmptyString,
  cwd: TrimmedNonEmptyString,
  packageName: TrimmedNonEmptyString,
  version: TrimmedNonEmptyString,
  exportPath: TrimmedNonEmptyString,
  componentCount: NonNegativeInt,
  tokenCount: NonNegativeInt,
  createdAt: IsoDateTime,
});
export type AutoDsmPublishedExport = typeof AutoDsmPublishedExport.Type;

/** --- RPC payloads --- */

/** Pinned AutoDSM onboarding / workspace template ids (see web `AUTO_DSM_STARTER_IDS`). */
export const AutoDsmWorkspaceStarterId = Schema.Literals([
  "modern-starter",
  "shadcn-ui",
  "mui",
  "chakra-ui",
  "tailwind-css",
]);
export type AutoDsmWorkspaceStarterId = typeof AutoDsmWorkspaceStarterId.Type;

export const AutoDsmWorkspaceMetadataStatusSchema = Schema.Literals([
  "creating",
  "ready",
  "failed",
]);
export type AutoDsmWorkspaceMetadataStatus = typeof AutoDsmWorkspaceMetadataStatusSchema.Type;

export const AutoDsmWorkspaceMetadata = Schema.Struct({
  workspaceId: TrimmedNonEmptyString,
  starterId: AutoDsmWorkspaceStarterId,
  createdAt: IsoDateTime,
  systemPath: TrimmedNonEmptyString,
  displayName: TrimmedNonEmptyString,
  status: AutoDsmWorkspaceMetadataStatusSchema,
  projectId: Schema.optional(ProjectId),
  ownerSubject: Schema.optional(Schema.NullOr(TrimmedString)),
  authProvider: Schema.optional(Schema.NullOr(TrimmedString)),
  storybookPort: Schema.optional(PositiveInt),
});
export type AutoDsmWorkspaceMetadata = typeof AutoDsmWorkspaceMetadata.Type;

export const AutoDsmCreateWorkspaceInput = Schema.Struct({
  starterId: AutoDsmWorkspaceStarterId,
  /** Client environment for orchestration projection (same WS session). */
  environmentId: EnvironmentId,
  displayName: Schema.optional(TrimmedString),
  /** Client idempotency key — duplicate concurrent requests return the same result. */
  requestId: Schema.optional(TrimmedNonEmptyString),
});
export type AutoDsmCreateWorkspaceInput = typeof AutoDsmCreateWorkspaceInput.Type;

export const AutoDsmCreateWorkspaceThreadSeed = Schema.Struct({
  threadId: ThreadId,
  title: TrimmedNonEmptyString,
  /** Registry-style path: `/src/components/…` for preview binding */
  componentPath: TrimmedNonEmptyString,
  group: Schema.optional(TrimmedNonEmptyString),
});
export type AutoDsmCreateWorkspaceThreadSeed = typeof AutoDsmCreateWorkspaceThreadSeed.Type;

export const AutoDsmCreateWorkspaceResult = Schema.Struct({
  workspaceId: TrimmedNonEmptyString,
  cwd: TrimmedNonEmptyString,
  projectId: ProjectId,
  starterId: AutoDsmWorkspaceStarterId,
  threads: Schema.Array(AutoDsmCreateWorkspaceThreadSeed),
});
export type AutoDsmCreateWorkspaceResult = typeof AutoDsmCreateWorkspaceResult.Type;

/** Optional filter for workspace history (auth-ready; pre-auth lists all local systems). */
export const AutoDsmListWorkspaceHistoryInput = Schema.Struct({
  ownerSubject: Schema.optional(TrimmedString),
});
export type AutoDsmListWorkspaceHistoryInput = typeof AutoDsmListWorkspaceHistoryInput.Type;

export const AutoDsmWorkspaceHistoryEntry = Schema.Struct({
  workspaceId: TrimmedNonEmptyString,
  displayName: TrimmedNonEmptyString,
  starterId: AutoDsmWorkspaceStarterId,
  createdAt: IsoDateTime,
  systemPath: TrimmedNonEmptyString,
  projectId: Schema.optional(ProjectId),
  ownerSubject: Schema.optional(TrimmedString),
  authProvider: Schema.optional(TrimmedString),
});
export type AutoDsmWorkspaceHistoryEntry = typeof AutoDsmWorkspaceHistoryEntry.Type;

export const AutoDsmListWorkspaceHistoryResult = Schema.Struct({
  entries: Schema.Array(AutoDsmWorkspaceHistoryEntry),
});
export type AutoDsmListWorkspaceHistoryResult = typeof AutoDsmListWorkspaceHistoryResult.Type;

/** Stable client/server message when local one-DS policy blocks create. */
export const AUTODSM_DESIGN_SYSTEM_ALREADY_EXISTS_MESSAGE =
  "A design system already exists on this machine." as const;

export const AutoDsmDeleteWorkspaceInput = Schema.Struct({
  workspaceId: TrimmedNonEmptyString,
});
export type AutoDsmDeleteWorkspaceInput = typeof AutoDsmDeleteWorkspaceInput.Type;

export const AutoDsmDeleteWorkspaceResult = Schema.Struct({
  workspaceId: TrimmedNonEmptyString,
});
export type AutoDsmDeleteWorkspaceResult = typeof AutoDsmDeleteWorkspaceResult.Type;

export const AutoDsmCwdInput = Schema.Struct({
  cwd: TrimmedNonEmptyString,
});
export type AutoDsmCwdInput = typeof AutoDsmCwdInput.Type;

/** Add a user-defined brand token to the workspace token store. */
export const AutoDsmBrandTokenAddInput = Schema.Struct({
  cwd: TrimmedNonEmptyString,
  token: AutoDsmBrandTokenDraft,
});
export type AutoDsmBrandTokenAddInput = typeof AutoDsmBrandTokenAddInput.Type;

/** Remove a brand token (scanned or user-defined) from the workspace token store. */
export const AutoDsmBrandTokenRemoveInput = Schema.Struct({
  cwd: TrimmedNonEmptyString,
  tokenId: TrimmedNonEmptyString,
});
export type AutoDsmBrandTokenRemoveInput = typeof AutoDsmBrandTokenRemoveInput.Type;

/** Patch fields for an existing brand token. */
export const AutoDsmBrandTokenPatch = Schema.Struct({
  name: Schema.optional(TrimmedNonEmptyString),
  value: Schema.optional(TrimmedNonEmptyString),
  color: Schema.optional(AutoDsmColorTokenValue),
  typography: Schema.optional(AutoDsmTypographyTokenValue),
});
export type AutoDsmBrandTokenPatch = typeof AutoDsmBrandTokenPatch.Type;

/** Update an existing brand token in the workspace token store. */
export const AutoDsmBrandTokenUpdateInput = Schema.Struct({
  cwd: TrimmedNonEmptyString,
  tokenId: TrimmedNonEmptyString,
  patch: AutoDsmBrandTokenPatch,
});
export type AutoDsmBrandTokenUpdateInput = typeof AutoDsmBrandTokenUpdateInput.Type;

/** Re-extract scanned tokens from installed design-system theme files. */
export const AutoDsmBrandTokenResyncInput = Schema.Struct({
  cwd: TrimmedNonEmptyString,
  forceReseed: Schema.optional(Schema.Boolean),
});
export type AutoDsmBrandTokenResyncInput = typeof AutoDsmBrandTokenResyncInput.Type;

export const AutoDsmWorkspacePreviewCssResult = Schema.Struct({
  css: TrimmedString,
});
export type AutoDsmWorkspacePreviewCssResult = typeof AutoDsmWorkspacePreviewCssResult.Type;

export const AutoDsmRegistryEntryInput = Schema.Struct({
  cwd: TrimmedNonEmptyString,
  entryId: AutoDsmRegistryEntryId,
});
export type AutoDsmRegistryEntryInput = typeof AutoDsmRegistryEntryInput.Type;

export const AutoDsmRegistryEntryResult = Schema.Struct({
  entry: Schema.NullOr(AutoDsmComponentRegistryEntry),
});
export type AutoDsmRegistryEntryResult = typeof AutoDsmRegistryEntryResult.Type;

export const AutoDsmRenderManifestLookupInput = Schema.Struct({
  cwd: TrimmedNonEmptyString,
  manifestId: AutoDsmRenderManifestId,
});
export type AutoDsmRenderManifestLookupInput = typeof AutoDsmRenderManifestLookupInput.Type;

export const AutoDsmScanArtifactLookupInput = Schema.Struct({
  cwd: TrimmedNonEmptyString,
  scanId: AutoDsmScanArtifactId,
});
export type AutoDsmScanArtifactLookupInput = typeof AutoDsmScanArtifactLookupInput.Type;

export class AutoDsmRpcError extends Schema.TaggedErrorClass<AutoDsmRpcError>()("AutoDsmRpcError", {
  message: TrimmedNonEmptyString,
  cause: Schema.optional(Schema.Defect),
}) {}

export const AutoDsmRenderPlanInput = Schema.Struct({
  cwd: TrimmedNonEmptyString,
  componentId: AutoDsmComponentId,
  exportName: TrimmedNonEmptyString,
  propsJson: TrimmedString,
  viewport: Schema.optional(AutoDsmViewportSpec),
  theme: Schema.optional(TrimmedNonEmptyString),
});
export type AutoDsmRenderPlanInput = typeof AutoDsmRenderPlanInput.Type;

export const AutoDsmRenderPlanResult = Schema.Struct({
  plan: AutoDsmRenderPlan,
});
export type AutoDsmRenderPlanResult = typeof AutoDsmRenderPlanResult.Type;

export const AutoDsmExecuteRenderPlanResult = Schema.Struct({
  plan: AutoDsmRenderPlan,
  manifest: AutoDsmRenderManifest,
  /** Bundled ES module preview script (when compile succeeded); large local-only payload. */
  bundledJavascript: Schema.optional(Schema.String),
});
export type AutoDsmExecuteRenderPlanResult = typeof AutoDsmExecuteRenderPlanResult.Type;

export const AutoDsmSidecarStatusInput = Schema.Struct({
  cwd: TrimmedNonEmptyString,
});
export type AutoDsmSidecarStatusInput = typeof AutoDsmSidecarStatusInput.Type;

export const AutoDsmSidecarStatusResult = Schema.Struct({
  running: Schema.Boolean,
  port: Schema.optional(PositiveInt),
  origin: Schema.optional(TrimmedNonEmptyString),
  lastError: Schema.optional(TrimmedString),
});
export type AutoDsmSidecarStatusResult = typeof AutoDsmSidecarStatusResult.Type;

export const AutoDsmProviderCatalogEntry = Schema.Struct({
  id: ProviderPackIdSchema,
  layer: ProviderPackLayerSchema,
  description: TrimmedString,
});
export type AutoDsmProviderCatalogEntry = typeof AutoDsmProviderCatalogEntry.Type;

export const AutoDsmProviderCatalogResult = Schema.Struct({
  packs: Schema.Array(AutoDsmProviderCatalogEntry),
});
export type AutoDsmProviderCatalogResult = typeof AutoDsmProviderCatalogResult.Type;

export const AutoDsmChangeSetCreateInput = Schema.Struct({
  cwd: TrimmedNonEmptyString,
  ops: Schema.Array(AutoDsmChangeOp),
  threadId: Schema.optional(ThreadId),
});
export type AutoDsmChangeSetCreateInput = typeof AutoDsmChangeSetCreateInput.Type;

export const AutoDsmChangeSetIdInput = Schema.Struct({
  cwd: TrimmedNonEmptyString,
  changeSetId: AutoDsmChangeSetId,
  threadId: Schema.optional(ThreadId),
});
export type AutoDsmChangeSetIdInput = typeof AutoDsmChangeSetIdInput.Type;

export const AutoDsmChangeSetMutationResult = Schema.Struct({
  changeSet: AutoDsmChangeSet,
  preview: Schema.optional(AutoDsmChangeSetPreview),
  outcome: Schema.optional(AutoDsmEditOutcome),
});
export type AutoDsmChangeSetMutationResult = typeof AutoDsmChangeSetMutationResult.Type;

export const AutoDsmGenerationPlanAssembleInput = Schema.Struct({
  cwd: TrimmedNonEmptyString,
  threadId: Schema.optional(ThreadId),
  projectId: Schema.optional(ProjectId),
  userIntent: TrimmedString,
  componentId: Schema.optional(AutoDsmComponentId),
});
export type AutoDsmGenerationPlanAssembleInput = typeof AutoDsmGenerationPlanAssembleInput.Type;

export const AutoDsmGenerationPlanResult = Schema.Struct({
  plan: AutoDsmGenerationPlan,
});
export type AutoDsmGenerationPlanResult = typeof AutoDsmGenerationPlanResult.Type;

export const AutoDsmPublishedSnapshotExportInput = Schema.Struct({
  cwd: TrimmedNonEmptyString,
  label: Schema.optional(TrimmedNonEmptyString),
});
export type AutoDsmPublishedSnapshotExportInput = typeof AutoDsmPublishedSnapshotExportInput.Type;

export const AutoDsmPublishedSnapshotExportResult = Schema.Struct({
  snapshot: AutoDsmPublishedSnapshot,
  exportPath: AutoDsmWorkspaceRelativePath,
});
export type AutoDsmPublishedSnapshotExportResult = typeof AutoDsmPublishedSnapshotExportResult.Type;

export const AutoDsmPublishedExportInput = Schema.Struct({
  cwd: TrimmedNonEmptyString,
  version: Schema.optional(TrimmedNonEmptyString),
  registryUrl: Schema.optional(TrimmedNonEmptyString),
  authToken: Schema.optional(TrimmedNonEmptyString),
});
export type AutoDsmPublishedExportInput = typeof AutoDsmPublishedExportInput.Type;

export const AutoDsmPublishedExportResult = Schema.Struct({
  publishedExport: AutoDsmPublishedExport,
});
export type AutoDsmPublishedExportResult = typeof AutoDsmPublishedExportResult.Type;

export const AutoDsmPullRequestCreateInput = Schema.Struct({
  cwd: TrimmedNonEmptyString,
  title: TrimmedNonEmptyString,
  summary: Schema.optional(TrimmedString),
  changeSetIds: Schema.Array(AutoDsmChangeSetId),
});
export type AutoDsmPullRequestCreateInput = typeof AutoDsmPullRequestCreateInput.Type;

export const AutoDsmPullRequestCreateResult = Schema.Struct({
  pullRequest: AutoDsmPullRequest,
});
export type AutoDsmPullRequestCreateResult = typeof AutoDsmPullRequestCreateResult.Type;

export const AutoDsmPullRequestListInput = Schema.Struct({
  cwd: TrimmedNonEmptyString,
});
export type AutoDsmPullRequestListInput = typeof AutoDsmPullRequestListInput.Type;

export const AutoDsmPullRequestListResult = Schema.Struct({
  pullRequests: Schema.Array(AutoDsmPullRequest),
});
export type AutoDsmPullRequestListResult = typeof AutoDsmPullRequestListResult.Type;

export const AutoDsmActivityListInput = Schema.Struct({
  cwd: TrimmedNonEmptyString,
  limit: Schema.optional(PositiveInt),
});
export type AutoDsmActivityListInput = typeof AutoDsmActivityListInput.Type;

export const AutoDsmActivityListResult = Schema.Struct({
  entries: Schema.Array(AutoDsmActivityEntry),
});
export type AutoDsmActivityListResult = typeof AutoDsmActivityListResult.Type;

export const AutoDsmComponentAgentStatusSchema = Schema.Literals([
  "creating",
  "active",
  "archived",
]);
export type AutoDsmComponentAgentStatus = typeof AutoDsmComponentAgentStatusSchema.Type;

export const AutoDsmComponentAgentSourceSchema = Schema.Literals(["starter", "user"]);
export type AutoDsmComponentAgentSource = typeof AutoDsmComponentAgentSourceSchema.Type;

export const AutoDsmComponentAgentRecord = Schema.Struct({
  threadId: ThreadId,
  sessionId: AutoDsmSessionId,
  title: TrimmedNonEmptyString,
  componentPath: AutoDsmWorkspaceRelativePath,
  /** Semantic sidebar folder label (Buttons, Cards, …). */
  group: Schema.optional(TrimmedNonEmptyString),
  componentId: Schema.optional(AutoDsmComponentId),
  status: AutoDsmComponentAgentStatusSchema,
  source: AutoDsmComponentAgentSourceSchema,
  createdAt: IsoDateTime,
  lastRenderedAt: Schema.optional(IsoDateTime),
});
export type AutoDsmComponentAgentRecord = typeof AutoDsmComponentAgentRecord.Type;

export const AutoDsmComponentAgentsManifest = Schema.Struct({
  schemaVersion: Schema.Int,
  workspaceId: TrimmedNonEmptyString,
  agents: Schema.Array(AutoDsmComponentAgentRecord),
});
export type AutoDsmComponentAgentsManifest = typeof AutoDsmComponentAgentsManifest.Type;

export const AutoDsmComponentConversationMessage = Schema.Struct({
  role: Schema.Literals(["user", "assistant", "system"]),
  text: TrimmedString,
  threadId: Schema.optional(ThreadId),
  turnId: Schema.optional(TurnId),
  createdAt: IsoDateTime,
});
export type AutoDsmComponentConversationMessage = typeof AutoDsmComponentConversationMessage.Type;

export const AutoDsmComponentConversation = Schema.Struct({
  componentPath: AutoDsmWorkspaceRelativePath,
  componentId: Schema.optional(AutoDsmComponentId),
  threadIds: Schema.Array(ThreadId),
  messages: Schema.Array(AutoDsmComponentConversationMessage),
  updatedAt: IsoDateTime,
});
export type AutoDsmComponentConversation = typeof AutoDsmComponentConversation.Type;

export const AutoDsmSessionStatusSchema = Schema.Literals(["active", "closed"]);
export type AutoDsmSessionStatus = typeof AutoDsmSessionStatusSchema.Type;

export const AutoDsmSession = Schema.Struct({
  sessionId: AutoDsmSessionId,
  componentPath: AutoDsmWorkspaceRelativePath,
  componentId: Schema.optional(AutoDsmComponentId),
  threadId: ThreadId,
  branchName: Schema.optional(TrimmedNonEmptyString),
  status: AutoDsmSessionStatusSchema,
  changeSetIds: Schema.Array(AutoDsmChangeSetId),
  createdAt: IsoDateTime,
});
export type AutoDsmSession = typeof AutoDsmSession.Type;

export const AutoDsmComponentAgentListInput = Schema.Struct({
  cwd: TrimmedNonEmptyString,
});
export type AutoDsmComponentAgentListInput = typeof AutoDsmComponentAgentListInput.Type;

export const AutoDsmComponentAgentListResult = Schema.Struct({
  manifest: AutoDsmComponentAgentsManifest,
});
export type AutoDsmComponentAgentListResult = typeof AutoDsmComponentAgentListResult.Type;

export const AutoDsmComponentAgentRegisterInput = Schema.Struct({
  cwd: TrimmedNonEmptyString,
  threadId: ThreadId,
  title: TrimmedNonEmptyString,
  componentPath: AutoDsmWorkspaceRelativePath,
  group: Schema.optional(TrimmedNonEmptyString),
  source: AutoDsmComponentAgentSourceSchema,
  status: Schema.optional(AutoDsmComponentAgentStatusSchema),
});
export type AutoDsmComponentAgentRegisterInput = typeof AutoDsmComponentAgentRegisterInput.Type;

export const AutoDsmComponentAgentRegisterResult = Schema.Struct({
  agent: AutoDsmComponentAgentRecord,
  session: AutoDsmSession,
});
export type AutoDsmComponentAgentRegisterResult = typeof AutoDsmComponentAgentRegisterResult.Type;

export const AutoDsmComponentAgentUpdateInput = Schema.Struct({
  cwd: TrimmedNonEmptyString,
  threadId: ThreadId,
  status: Schema.optional(AutoDsmComponentAgentStatusSchema),
  componentId: Schema.optional(AutoDsmComponentId),
  lastRenderedAt: Schema.optional(IsoDateTime),
});
export type AutoDsmComponentAgentUpdateInput = typeof AutoDsmComponentAgentUpdateInput.Type;

export const AutoDsmComponentAgentUpdateResult = Schema.Struct({
  agent: AutoDsmComponentAgentRecord,
});
export type AutoDsmComponentAgentUpdateResult = typeof AutoDsmComponentAgentUpdateResult.Type;

export const AutoDsmComponentAgentRemoveInput = Schema.Struct({
  cwd: TrimmedNonEmptyString,
  threadId: ThreadId,
});
export type AutoDsmComponentAgentRemoveInput = typeof AutoDsmComponentAgentRemoveInput.Type;

export const AutoDsmComponentAgentRemoveResult = Schema.Struct({
  removed: Schema.Boolean,
});
export type AutoDsmComponentAgentRemoveResult = typeof AutoDsmComponentAgentRemoveResult.Type;

export const AutoDsmComponentConversationGetInput = Schema.Struct({
  cwd: TrimmedNonEmptyString,
  componentPath: AutoDsmWorkspaceRelativePath,
});
export type AutoDsmComponentConversationGetInput = typeof AutoDsmComponentConversationGetInput.Type;

export const AutoDsmComponentConversationGetResult = Schema.Struct({
  conversation: Schema.NullOr(AutoDsmComponentConversation),
});
export type AutoDsmComponentConversationGetResult =
  typeof AutoDsmComponentConversationGetResult.Type;

export const AutoDsmComponentConversationAppendInput = Schema.Struct({
  cwd: TrimmedNonEmptyString,
  componentPath: AutoDsmWorkspaceRelativePath,
  componentId: Schema.optional(AutoDsmComponentId),
  threadId: ThreadId,
  message: AutoDsmComponentConversationMessage,
});
export type AutoDsmComponentConversationAppendInput =
  typeof AutoDsmComponentConversationAppendInput.Type;

export const AutoDsmComponentConversationAppendResult = Schema.Struct({
  conversation: AutoDsmComponentConversation,
});
export type AutoDsmComponentConversationAppendResult =
  typeof AutoDsmComponentConversationAppendResult.Type;

export const AutoDsmSessionGetInput = Schema.Struct({
  cwd: TrimmedNonEmptyString,
  sessionId: AutoDsmSessionId,
});
export type AutoDsmSessionGetInput = typeof AutoDsmSessionGetInput.Type;

export const AutoDsmSessionGetResult = Schema.Struct({
  session: Schema.NullOr(AutoDsmSession),
});
export type AutoDsmSessionGetResult = typeof AutoDsmSessionGetResult.Type;

export const AutoDsmSessionCreateInput = Schema.Struct({
  cwd: TrimmedNonEmptyString,
  threadId: ThreadId,
  componentPath: AutoDsmWorkspaceRelativePath,
  componentId: Schema.optional(AutoDsmComponentId),
  branchName: Schema.optional(TrimmedNonEmptyString),
});
export type AutoDsmSessionCreateInput = typeof AutoDsmSessionCreateInput.Type;

export const AutoDsmSessionCreateResult = Schema.Struct({
  session: AutoDsmSession,
});
export type AutoDsmSessionCreateResult = typeof AutoDsmSessionCreateResult.Type;

export const AutoDsmSessionChangeSetListInput = Schema.Struct({
  cwd: TrimmedNonEmptyString,
  sessionId: AutoDsmSessionId,
});
export type AutoDsmSessionChangeSetListInput = typeof AutoDsmSessionChangeSetListInput.Type;

export const AutoDsmSessionChangeSetListResult = Schema.Struct({
  changeSets: Schema.Array(AutoDsmChangeSet),
});
export type AutoDsmSessionChangeSetListResult = typeof AutoDsmSessionChangeSetListResult.Type;

export const AutoDsmGitSessionBranchInput = Schema.Struct({
  cwd: TrimmedNonEmptyString,
  sessionKey: TrimmedNonEmptyString,
  baseBranch: Schema.optional(TrimmedNonEmptyString),
});
export type AutoDsmGitSessionBranchInput = typeof AutoDsmGitSessionBranchInput.Type;

export const AutoDsmGitSessionBranchResult = Schema.Struct({
  branchName: TrimmedNonEmptyString,
});
export type AutoDsmGitSessionBranchResult = typeof AutoDsmGitSessionBranchResult.Type;

export const AutoDsmIssuesForPromptInput = Schema.Struct({
  cwd: TrimmedNonEmptyString,
  componentId: Schema.optional(AutoDsmComponentId),
  maxViolations: Schema.optional(PositiveInt),
});
export type AutoDsmIssuesForPromptInput = typeof AutoDsmIssuesForPromptInput.Type;

export const AutoDsmIssuesForPromptResult = Schema.Struct({
  text: TrimmedString,
  scanId: Schema.optional(AutoDsmScanArtifactId),
});
export type AutoDsmIssuesForPromptResult = typeof AutoDsmIssuesForPromptResult.Type;

export const AutoDsmScanRunInput = Schema.Struct({
  cwd: TrimmedNonEmptyString,
  relativePath: AutoDsmWorkspaceRelativePath,
  componentId: Schema.optional(AutoDsmComponentId),
  renderManifestId: Schema.optional(AutoDsmRenderManifestId),
});
export type AutoDsmScanRunInput = typeof AutoDsmScanRunInput.Type;

export const AutoDsmScanRunResult = Schema.Struct({
  scan: AutoDsmScanArtifact,
});
export type AutoDsmScanRunResult = typeof AutoDsmScanRunResult.Type;

export const AutoDsmSidecarStartInput = Schema.Struct({
  cwd: TrimmedNonEmptyString,
});
export type AutoDsmSidecarStartInput = typeof AutoDsmSidecarStartInput.Type;

/** Encode helper for tests — validates round-trip. */
export const encodeAutoDsmProjectProfile = Schema.encodeEffect(AutoDsmProjectProfile);

const decodeAutoDsmProjectProfileUnknownEffect = Schema.decodeUnknownEffect(AutoDsmProjectProfile);

export const decodeAutoDsmProjectProfileUnknown = (value: unknown) =>
  decodeAutoDsmProjectProfileUnknownEffect(value).pipe(
    Effect.mapError(
      (e) => new AutoDsmRpcError({ message: "Invalid ProjectProfile", cause: e as never }),
    ),
  );
