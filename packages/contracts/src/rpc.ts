import * as Schema from "effect/Schema";
import * as Rpc from "effect/unstable/rpc/Rpc";
import * as RpcGroup from "effect/unstable/rpc/RpcGroup";

import { ExternalLauncherError, LaunchEditorInput } from "./editor.ts";
import { AuthAccessStreamEvent } from "./auth.ts";
import {
  FilesystemBrowseInput,
  FilesystemBrowseResult,
  FilesystemBrowseError,
} from "./filesystem.ts";
import {
  GitActionProgressEvent,
  VcsSwitchRefInput,
  VcsSwitchRefResult,
  GitCommandError,
  VcsCreateRefInput,
  VcsCreateRefResult,
  VcsCreateWorktreeInput,
  VcsCreateWorktreeResult,
  VcsInitInput,
  VcsListRefsInput,
  VcsListRefsResult,
  GitManagerServiceError,
  GitPreparePullRequestThreadInput,
  GitPreparePullRequestThreadResult,
  VcsPullInput,
  GitPullRequestRefInput,
  VcsPullResult,
  VcsRemoveWorktreeInput,
  GitResolvePullRequestResult,
  GitRunStackedActionInput,
  VcsStatusInput,
  VcsStatusResult,
  VcsStatusStreamEvent,
} from "./git.ts";
import { KeybindingsConfigError } from "./keybindings.ts";
import {
  ClientOrchestrationCommand,
  ORCHESTRATION_WS_METHODS,
  OrchestrationDispatchCommandError,
  OrchestrationGetFullThreadDiffError,
  OrchestrationGetFullThreadDiffInput,
  OrchestrationGetSnapshotError,
  OrchestrationGetTurnDiffError,
  OrchestrationGetTurnDiffInput,
  OrchestrationReplayEventsError,
  OrchestrationReplayEventsInput,
  OrchestrationRpcSchemas,
} from "./orchestration.ts";
import { ProviderInstanceId } from "./providerInstance.ts";
import {
  ProjectAnalyzeReactComponentError,
  ProjectAnalyzeReactComponentInput,
  ProjectAnalyzeReactComponentResult,
  ProjectBuildComponentPreviewError,
  ProjectBuildComponentPreviewInput,
  ProjectBuildComponentPreviewResult,
  ProjectReadFileError,
  ProjectReadFileInput,
  ProjectReadFileResult,
  ProjectSearchEntriesError,
  ProjectSearchEntriesInput,
  ProjectSearchEntriesResult,
  ProjectWriteFileError,
  ProjectWriteFileInput,
  ProjectWriteFileResult,
} from "./project.ts";
import {
  AutoDsmBrandProfile,
  AutoDsmBrandTokenAddInput,
  AutoDsmBrandTokenRemoveInput,
  AutoDsmBrandTokenResyncInput,
  AutoDsmBrandTokenUpdateInput,
  AutoDsmWorkspacePreviewCssResult,
  AutoDsmChangeSetCreateInput,
  AutoDsmChangeSetIdInput,
  AutoDsmChangeSetMutationResult,
  AutoDsmComponentRegistry,
  AutoDsmCwdInput,
  AutoDsmCreateWorkspaceInput,
  AutoDsmCreateWorkspaceResult,
  AutoDsmListWorkspaceHistoryInput,
  AutoDsmListWorkspaceHistoryResult,
  AutoDsmDeleteWorkspaceInput,
  AutoDsmDeleteWorkspaceResult,
  AutoDsmWorkspaceBuildInput,
  AutoDsmWorkspaceBuildResult,
  AutoDsmGenerationPlanAssembleInput,
  AutoDsmGenerationPlanResult,
  AutoDsmGitSessionBranchInput,
  AutoDsmGitSessionBranchResult,
  AutoDsmIssuesForPromptInput,
  AutoDsmIssuesForPromptResult,
  AutoDsmProjectProfile,
  AutoDsmPublishedSnapshotExportInput,
  AutoDsmPublishedSnapshotExportResult,
  AutoDsmRegistryEntryInput,
  AutoDsmRegistryEntryResult,
  AutoDsmRenderEnvironmentProfile,
  AutoDsmRenderManifest,
  AutoDsmRenderManifestLookupInput,
  AutoDsmRenderPlanInput,
  AutoDsmRenderPlanResult,
  AutoDsmExecuteRenderPlanResult,
  AutoDsmRpcError,
  AutoDsmScanArtifact,
  AutoDsmScanArtifactLookupInput,
  AutoDsmScanRunInput,
  AutoDsmScanRunResult,
  AutoDsmSidecarStartInput,
  AutoDsmSidecarStatusInput,
  AutoDsmSidecarStatusResult,
  AutoDsmIndexingProgressEvent,
  AutoDsmActivityListInput,
  AutoDsmActivityListResult,
  AutoDsmComponentAgentListInput,
  AutoDsmComponentAgentListResult,
  AutoDsmComponentAgentRegisterInput,
  AutoDsmComponentAgentRegisterResult,
  AutoDsmComponentAgentUpdateInput,
  AutoDsmComponentAgentUpdateResult,
  AutoDsmComponentAgentRemoveInput,
  AutoDsmComponentAgentRemoveResult,
  AutoDsmComponentConversationAppendInput,
  AutoDsmComponentConversationAppendResult,
  AutoDsmComponentConversationGetInput,
  AutoDsmComponentConversationGetResult,
  AutoDsmSessionChangeSetListInput,
  AutoDsmSessionChangeSetListResult,
  AutoDsmSessionCreateInput,
  AutoDsmSessionCreateResult,
  AutoDsmSessionGetInput,
  AutoDsmSessionGetResult,
  AutoDsmProviderCatalogResult,
  AutoDsmPullRequestCreateInput,
  AutoDsmPullRequestCreateResult,
  AutoDsmPullRequestListInput,
  AutoDsmPullRequestListResult,
  AutoDsmPublishedExportInput,
  AutoDsmPublishedExportResult,
} from "./autodsmArtifacts.ts";
import {
  TerminalClearInput,
  TerminalCloseInput,
  TerminalError,
  TerminalEvent,
  TerminalOpenInput,
  TerminalResizeInput,
  TerminalRestartInput,
  TerminalSessionSnapshot,
  TerminalWriteInput,
} from "./terminal.ts";
import {
  ServerConfigStreamEvent,
  ServerConfig,
  ServerProviderUpdateError,
  ServerProviderUpdateInput,
  ServerLifecycleStreamEvent,
  ServerRemoveKeybindingInput,
  ServerRemoveKeybindingResult,
  ServerProviderUpdatedPayload,
  ServerTraceDiagnosticsResult,
  ServerProcessDiagnosticsResult,
  ServerProcessResourceHistoryInput,
  ServerProcessResourceHistoryResult,
  ServerSignalProcessInput,
  ServerSignalProcessResult,
  ServerUpsertKeybindingInput,
  ServerUpsertKeybindingResult,
} from "./server.ts";
import { ServerSettings, ServerSettingsError, ServerSettingsPatch } from "./settings.ts";
import {
  SourceControlCloneRepositoryInput,
  SourceControlCloneRepositoryResult,
  SourceControlDiscoveryResult,
  SourceControlPublishRepositoryInput,
  SourceControlPublishRepositoryResult,
  SourceControlRepositoryError,
  SourceControlRepositoryInfo,
  SourceControlRepositoryLookupInput,
} from "./sourceControl.ts";
import { VcsError } from "./vcs.ts";

export const WS_METHODS = {
  // Project registry methods
  projectsList: "projects.list",
  projectsAdd: "projects.add",
  projectsRemove: "projects.remove",
  projectsSearchEntries: "projects.searchEntries",
  projectsWriteFile: "projects.writeFile",
  projectsReadFile: "projects.readFile",
  projectsAnalyzeReactComponent: "projects.analyzeReactComponent",
  projectsBuildComponentPreview: "projects.buildComponentPreview",

  autodsmGetProjectProfile: "autodsm.getProjectProfile",
  autodsmGetBrandProfile: "autodsm.getBrandProfile",
  autodsmAddBrandToken: "autodsm.addBrandToken",
  autodsmRemoveBrandToken: "autodsm.removeBrandToken",
  autodsmUpdateBrandToken: "autodsm.updateBrandToken",
  autodsmResyncBrandTokens: "autodsm.resyncBrandTokens",
  autodsmGetWorkspacePreviewCss: "autodsm.getWorkspacePreviewCss",
  autodsmGetComponentRegistry: "autodsm.getComponentRegistry",
  autodsmRunWorkspaceBuild: "autodsm.runWorkspaceBuild",
  autodsmGetComponentRegistryEntry: "autodsm.getComponentRegistryEntry",
  autodsmGetRenderEnvironmentProfile: "autodsm.getRenderEnvironmentProfile",
  autodsmGetRenderManifest: "autodsm.getRenderManifest",
  autodsmGetScanArtifact: "autodsm.getScanArtifact",
  autodsmSubscribeIndexingProgress: "autodsm.subscribeIndexingProgress",
  autodsmRunScan: "autodsm.runScan",
  autodsmBuildRenderPlan: "autodsm.buildRenderPlan",
  autodsmExecuteRenderPlan: "autodsm.executeRenderPlan",
  autodsmGetSidecarStatus: "autodsm.getSidecarStatus",
  autodsmStartSidecar: "autodsm.startSidecar",
  autodsmGetProviderCatalog: "autodsm.getProviderCatalog",
  autodsmChangeSetCreate: "autodsm.changeSetCreate",
  autodsmChangeSetPreview: "autodsm.changeSetPreview",
  autodsmChangeSetApply: "autodsm.changeSetApply",
  autodsmChangeSetRollback: "autodsm.changeSetRollback",
  autodsmAssembleGenerationPlan: "autodsm.assembleGenerationPlan",
  autodsmExportPublishedExport: "autodsm.exportPublishedExport",
  autodsmExportPublishedSnapshot: "autodsm.exportPublishedSnapshot",
  autodsmCreatePullRequest: "autodsm.createPullRequest",
  autodsmListPullRequests: "autodsm.listPullRequests",
  autodsmListActivity: "autodsm.listActivity",
  autodsmListComponentAgents: "autodsm.listComponentAgents",
  autodsmRegisterComponentAgent: "autodsm.registerComponentAgent",
  autodsmUpdateComponentAgent: "autodsm.updateComponentAgent",
  autodsmRemoveComponentAgent: "autodsm.removeComponentAgent",
  autodsmGetComponentConversation: "autodsm.getComponentConversation",
  autodsmAppendComponentConversation: "autodsm.appendComponentConversation",
  autodsmGetSession: "autodsm.getSession",
  autodsmCreateSession: "autodsm.createSession",
  autodsmListChangeSetsForSession: "autodsm.listChangeSetsForSession",
  autodsmPrepareSessionBranch: "autodsm.prepareSessionBranch",
  autodsmGetIssuesForPrompt: "autodsm.getIssuesForPrompt",
  autodsmCreateWorkspace: "autodsm.createWorkspace",
  autodsmListWorkspaceHistory: "autodsm.listWorkspaceHistory",
  autodsmDeleteWorkspace: "autodsm.deleteWorkspace",

  // Shell methods
  shellOpenInEditor: "shell.openInEditor",

  // Filesystem methods
  filesystemBrowse: "filesystem.browse",

  // VCS methods
  vcsPull: "vcs.pull",
  vcsRefreshStatus: "vcs.refreshStatus",
  vcsListRefs: "vcs.listRefs",
  vcsCreateWorktree: "vcs.createWorktree",
  vcsRemoveWorktree: "vcs.removeWorktree",
  vcsCreateRef: "vcs.createRef",
  vcsSwitchRef: "vcs.switchRef",
  vcsInit: "vcs.init",

  // Git workflow methods
  gitRunStackedAction: "git.runStackedAction",
  gitResolvePullRequest: "git.resolvePullRequest",
  gitPreparePullRequestThread: "git.preparePullRequestThread",

  // Terminal methods
  terminalOpen: "terminal.open",
  terminalWrite: "terminal.write",
  terminalResize: "terminal.resize",
  terminalClear: "terminal.clear",
  terminalRestart: "terminal.restart",
  terminalClose: "terminal.close",

  // Server meta
  serverGetConfig: "server.getConfig",
  serverRefreshProviders: "server.refreshProviders",
  serverUpdateProvider: "server.updateProvider",
  serverUpsertKeybinding: "server.upsertKeybinding",
  serverRemoveKeybinding: "server.removeKeybinding",
  serverGetSettings: "server.getSettings",
  serverUpdateSettings: "server.updateSettings",
  serverDiscoverSourceControl: "server.discoverSourceControl",
  serverGetTraceDiagnostics: "server.getTraceDiagnostics",
  serverGetProcessDiagnostics: "server.getProcessDiagnostics",
  serverGetProcessResourceHistory: "server.getProcessResourceHistory",
  serverSignalProcess: "server.signalProcess",

  // Source control methods
  sourceControlLookupRepository: "sourceControl.lookupRepository",
  sourceControlCloneRepository: "sourceControl.cloneRepository",
  sourceControlPublishRepository: "sourceControl.publishRepository",

  // Streaming subscriptions
  subscribeVcsStatus: "subscribeVcsStatus",
  subscribeTerminalEvents: "subscribeTerminalEvents",
  subscribeServerConfig: "subscribeServerConfig",
  subscribeServerLifecycle: "subscribeServerLifecycle",
  subscribeAuthAccess: "subscribeAuthAccess",
} as const;

export const WsServerUpsertKeybindingRpc = Rpc.make(WS_METHODS.serverUpsertKeybinding, {
  payload: ServerUpsertKeybindingInput,
  success: ServerUpsertKeybindingResult,
  error: KeybindingsConfigError,
});

export const WsServerRemoveKeybindingRpc = Rpc.make(WS_METHODS.serverRemoveKeybinding, {
  payload: ServerRemoveKeybindingInput,
  success: ServerRemoveKeybindingResult,
  error: KeybindingsConfigError,
});

export const WsServerGetConfigRpc = Rpc.make(WS_METHODS.serverGetConfig, {
  payload: Schema.Struct({}),
  success: ServerConfig,
  error: Schema.Union([KeybindingsConfigError, ServerSettingsError]),
});

export const WsServerRefreshProvidersRpc = Rpc.make(WS_METHODS.serverRefreshProviders, {
  payload: Schema.Struct({
    /**
     * When supplied, only refresh this specific provider instance. When
     * omitted, refresh all configured instances — the legacy `refresh()`
     * behaviour retained for transports that still dispatch untargeted
     * refreshes.
     */
    instanceId: Schema.optional(ProviderInstanceId),
  }),
  success: ServerProviderUpdatedPayload,
});

export const WsServerUpdateProviderRpc = Rpc.make(WS_METHODS.serverUpdateProvider, {
  payload: ServerProviderUpdateInput,
  success: ServerProviderUpdatedPayload,
  error: ServerProviderUpdateError,
});

export const WsServerGetSettingsRpc = Rpc.make(WS_METHODS.serverGetSettings, {
  payload: Schema.Struct({}),
  success: ServerSettings,
  error: ServerSettingsError,
});

export const WsServerUpdateSettingsRpc = Rpc.make(WS_METHODS.serverUpdateSettings, {
  payload: Schema.Struct({ patch: ServerSettingsPatch }),
  success: ServerSettings,
  error: ServerSettingsError,
});

export const WsServerDiscoverSourceControlRpc = Rpc.make(WS_METHODS.serverDiscoverSourceControl, {
  payload: Schema.Struct({}),
  success: SourceControlDiscoveryResult,
});

export const WsServerGetTraceDiagnosticsRpc = Rpc.make(WS_METHODS.serverGetTraceDiagnostics, {
  payload: Schema.Struct({}),
  success: ServerTraceDiagnosticsResult,
});

export const WsServerGetProcessDiagnosticsRpc = Rpc.make(WS_METHODS.serverGetProcessDiagnostics, {
  payload: Schema.Struct({}),
  success: ServerProcessDiagnosticsResult,
});

export const WsServerGetProcessResourceHistoryRpc = Rpc.make(
  WS_METHODS.serverGetProcessResourceHistory,
  {
    payload: ServerProcessResourceHistoryInput,
    success: ServerProcessResourceHistoryResult,
  },
);

export const WsServerSignalProcessRpc = Rpc.make(WS_METHODS.serverSignalProcess, {
  payload: ServerSignalProcessInput,
  success: ServerSignalProcessResult,
});

export const WsSourceControlLookupRepositoryRpc = Rpc.make(
  WS_METHODS.sourceControlLookupRepository,
  {
    payload: SourceControlRepositoryLookupInput,
    success: SourceControlRepositoryInfo,
    error: SourceControlRepositoryError,
  },
);

export const WsSourceControlCloneRepositoryRpc = Rpc.make(WS_METHODS.sourceControlCloneRepository, {
  payload: SourceControlCloneRepositoryInput,
  success: SourceControlCloneRepositoryResult,
  error: SourceControlRepositoryError,
});

export const WsSourceControlPublishRepositoryRpc = Rpc.make(
  WS_METHODS.sourceControlPublishRepository,
  {
    payload: SourceControlPublishRepositoryInput,
    success: SourceControlPublishRepositoryResult,
    error: SourceControlRepositoryError,
  },
);

export const WsProjectsSearchEntriesRpc = Rpc.make(WS_METHODS.projectsSearchEntries, {
  payload: ProjectSearchEntriesInput,
  success: ProjectSearchEntriesResult,
  error: ProjectSearchEntriesError,
});

export const WsProjectsWriteFileRpc = Rpc.make(WS_METHODS.projectsWriteFile, {
  payload: ProjectWriteFileInput,
  success: ProjectWriteFileResult,
  error: ProjectWriteFileError,
});

export const WsProjectsReadFileRpc = Rpc.make(WS_METHODS.projectsReadFile, {
  payload: ProjectReadFileInput,
  success: ProjectReadFileResult,
  error: ProjectReadFileError,
});

export const WsProjectsAnalyzeReactComponentRpc = Rpc.make(
  WS_METHODS.projectsAnalyzeReactComponent,
  {
    payload: ProjectAnalyzeReactComponentInput,
    success: ProjectAnalyzeReactComponentResult,
    error: ProjectAnalyzeReactComponentError,
  },
);

export const WsProjectsBuildComponentPreviewRpc = Rpc.make(
  WS_METHODS.projectsBuildComponentPreview,
  {
    payload: ProjectBuildComponentPreviewInput,
    success: ProjectBuildComponentPreviewResult,
    error: ProjectBuildComponentPreviewError,
  },
);

export const WsAutodsmGetProjectProfileRpc = Rpc.make(WS_METHODS.autodsmGetProjectProfile, {
  payload: AutoDsmCwdInput,
  success: AutoDsmProjectProfile,
  error: AutoDsmRpcError,
});

export const WsAutodsmGetBrandProfileRpc = Rpc.make(WS_METHODS.autodsmGetBrandProfile, {
  payload: AutoDsmCwdInput,
  success: AutoDsmBrandProfile,
  error: AutoDsmRpcError,
});

export const WsAutodsmAddBrandTokenRpc = Rpc.make(WS_METHODS.autodsmAddBrandToken, {
  payload: AutoDsmBrandTokenAddInput,
  success: AutoDsmBrandProfile,
  error: AutoDsmRpcError,
});

export const WsAutodsmRemoveBrandTokenRpc = Rpc.make(WS_METHODS.autodsmRemoveBrandToken, {
  payload: AutoDsmBrandTokenRemoveInput,
  success: AutoDsmBrandProfile,
  error: AutoDsmRpcError,
});

export const WsAutodsmUpdateBrandTokenRpc = Rpc.make(WS_METHODS.autodsmUpdateBrandToken, {
  payload: AutoDsmBrandTokenUpdateInput,
  success: AutoDsmBrandProfile,
  error: AutoDsmRpcError,
});

export const WsAutodsmResyncBrandTokensRpc = Rpc.make(WS_METHODS.autodsmResyncBrandTokens, {
  payload: AutoDsmBrandTokenResyncInput,
  success: AutoDsmBrandProfile,
  error: AutoDsmRpcError,
});

export const WsAutodsmGetWorkspacePreviewCssRpc = Rpc.make(
  WS_METHODS.autodsmGetWorkspacePreviewCss,
  {
    payload: AutoDsmCwdInput,
    success: AutoDsmWorkspacePreviewCssResult,
    error: AutoDsmRpcError,
  },
);

export const WsAutodsmGetComponentRegistryRpc = Rpc.make(WS_METHODS.autodsmGetComponentRegistry, {
  payload: AutoDsmCwdInput,
  success: AutoDsmComponentRegistry,
  error: AutoDsmRpcError,
});

export const WsAutodsmRunWorkspaceBuildRpc = Rpc.make(WS_METHODS.autodsmRunWorkspaceBuild, {
  payload: AutoDsmWorkspaceBuildInput,
  success: AutoDsmWorkspaceBuildResult,
  error: AutoDsmRpcError,
});

export const WsAutodsmGetComponentRegistryEntryRpc = Rpc.make(
  WS_METHODS.autodsmGetComponentRegistryEntry,
  {
    payload: AutoDsmRegistryEntryInput,
    success: AutoDsmRegistryEntryResult,
    error: AutoDsmRpcError,
  },
);

export const WsAutodsmGetRenderEnvironmentProfileRpc = Rpc.make(
  WS_METHODS.autodsmGetRenderEnvironmentProfile,
  {
    payload: AutoDsmCwdInput,
    success: AutoDsmRenderEnvironmentProfile,
    error: AutoDsmRpcError,
  },
);

export const WsAutodsmGetRenderManifestRpc = Rpc.make(WS_METHODS.autodsmGetRenderManifest, {
  payload: AutoDsmRenderManifestLookupInput,
  success: Schema.Struct({ manifest: Schema.NullOr(AutoDsmRenderManifest) }),
  error: AutoDsmRpcError,
});

export const WsAutodsmGetScanArtifactRpc = Rpc.make(WS_METHODS.autodsmGetScanArtifact, {
  payload: AutoDsmScanArtifactLookupInput,
  success: Schema.Struct({ scan: Schema.NullOr(AutoDsmScanArtifact) }),
  error: AutoDsmRpcError,
});

export const WsAutodsmSubscribeIndexingProgressRpc = Rpc.make(
  WS_METHODS.autodsmSubscribeIndexingProgress,
  {
    payload: AutoDsmCwdInput,
    success: AutoDsmIndexingProgressEvent,
    error: AutoDsmRpcError,
    stream: true,
  },
);

export const WsAutodsmRunScanRpc = Rpc.make(WS_METHODS.autodsmRunScan, {
  payload: AutoDsmScanRunInput,
  success: AutoDsmScanRunResult,
  error: AutoDsmRpcError,
});

export const WsAutodsmBuildRenderPlanRpc = Rpc.make(WS_METHODS.autodsmBuildRenderPlan, {
  payload: AutoDsmRenderPlanInput,
  success: AutoDsmRenderPlanResult,
  error: AutoDsmRpcError,
});

export const WsAutodsmExecuteRenderPlanRpc = Rpc.make(WS_METHODS.autodsmExecuteRenderPlan, {
  payload: AutoDsmRenderPlanInput,
  success: AutoDsmExecuteRenderPlanResult,
  error: AutoDsmRpcError,
});

export const WsAutodsmGetSidecarStatusRpc = Rpc.make(WS_METHODS.autodsmGetSidecarStatus, {
  payload: AutoDsmSidecarStatusInput,
  success: AutoDsmSidecarStatusResult,
  error: AutoDsmRpcError,
});

export const WsAutodsmStartSidecarRpc = Rpc.make(WS_METHODS.autodsmStartSidecar, {
  payload: AutoDsmSidecarStartInput,
  success: AutoDsmSidecarStatusResult,
  error: AutoDsmRpcError,
});

export const WsAutodsmGetProviderCatalogRpc = Rpc.make(WS_METHODS.autodsmGetProviderCatalog, {
  payload: Schema.Struct({}),
  success: AutoDsmProviderCatalogResult,
  error: AutoDsmRpcError,
});

export const WsAutodsmChangeSetCreateRpc = Rpc.make(WS_METHODS.autodsmChangeSetCreate, {
  payload: AutoDsmChangeSetCreateInput,
  success: AutoDsmChangeSetMutationResult,
  error: AutoDsmRpcError,
});

export const WsAutodsmChangeSetPreviewRpc = Rpc.make(WS_METHODS.autodsmChangeSetPreview, {
  payload: AutoDsmChangeSetIdInput,
  success: AutoDsmChangeSetMutationResult,
  error: AutoDsmRpcError,
});

export const WsAutodsmChangeSetApplyRpc = Rpc.make(WS_METHODS.autodsmChangeSetApply, {
  payload: AutoDsmChangeSetIdInput,
  success: AutoDsmChangeSetMutationResult,
  error: AutoDsmRpcError,
});

export const WsAutodsmChangeSetRollbackRpc = Rpc.make(WS_METHODS.autodsmChangeSetRollback, {
  payload: AutoDsmChangeSetIdInput,
  success: AutoDsmChangeSetMutationResult,
  error: AutoDsmRpcError,
});

export const WsAutodsmAssembleGenerationPlanRpc = Rpc.make(
  WS_METHODS.autodsmAssembleGenerationPlan,
  {
    payload: AutoDsmGenerationPlanAssembleInput,
    success: AutoDsmGenerationPlanResult,
    error: AutoDsmRpcError,
  },
);

export const WsAutodsmExportPublishedSnapshotRpc = Rpc.make(
  WS_METHODS.autodsmExportPublishedSnapshot,
  {
    payload: AutoDsmPublishedSnapshotExportInput,
    success: AutoDsmPublishedSnapshotExportResult,
    error: AutoDsmRpcError,
  },
);

export const WsAutodsmExportPublishedExportRpc = Rpc.make(WS_METHODS.autodsmExportPublishedExport, {
  payload: AutoDsmPublishedExportInput,
  success: AutoDsmPublishedExportResult,
  error: AutoDsmRpcError,
});

export const WsAutodsmCreatePullRequestRpc = Rpc.make(WS_METHODS.autodsmCreatePullRequest, {
  payload: AutoDsmPullRequestCreateInput,
  success: AutoDsmPullRequestCreateResult,
  error: AutoDsmRpcError,
});

export const WsAutodsmListPullRequestsRpc = Rpc.make(WS_METHODS.autodsmListPullRequests, {
  payload: AutoDsmPullRequestListInput,
  success: AutoDsmPullRequestListResult,
  error: AutoDsmRpcError,
});

export const WsAutodsmListActivityRpc = Rpc.make(WS_METHODS.autodsmListActivity, {
  payload: AutoDsmActivityListInput,
  success: AutoDsmActivityListResult,
  error: AutoDsmRpcError,
});

export const WsAutodsmListComponentAgentsRpc = Rpc.make(WS_METHODS.autodsmListComponentAgents, {
  payload: AutoDsmComponentAgentListInput,
  success: AutoDsmComponentAgentListResult,
  error: AutoDsmRpcError,
});

export const WsAutodsmRegisterComponentAgentRpc = Rpc.make(
  WS_METHODS.autodsmRegisterComponentAgent,
  {
    payload: AutoDsmComponentAgentRegisterInput,
    success: AutoDsmComponentAgentRegisterResult,
    error: AutoDsmRpcError,
  },
);

export const WsAutodsmUpdateComponentAgentRpc = Rpc.make(WS_METHODS.autodsmUpdateComponentAgent, {
  payload: AutoDsmComponentAgentUpdateInput,
  success: AutoDsmComponentAgentUpdateResult,
  error: AutoDsmRpcError,
});

export const WsAutodsmRemoveComponentAgentRpc = Rpc.make(WS_METHODS.autodsmRemoveComponentAgent, {
  payload: AutoDsmComponentAgentRemoveInput,
  success: AutoDsmComponentAgentRemoveResult,
  error: AutoDsmRpcError,
});

export const WsAutodsmGetComponentConversationRpc = Rpc.make(
  WS_METHODS.autodsmGetComponentConversation,
  {
    payload: AutoDsmComponentConversationGetInput,
    success: AutoDsmComponentConversationGetResult,
    error: AutoDsmRpcError,
  },
);

export const WsAutodsmAppendComponentConversationRpc = Rpc.make(
  WS_METHODS.autodsmAppendComponentConversation,
  {
    payload: AutoDsmComponentConversationAppendInput,
    success: AutoDsmComponentConversationAppendResult,
    error: AutoDsmRpcError,
  },
);

export const WsAutodsmGetSessionRpc = Rpc.make(WS_METHODS.autodsmGetSession, {
  payload: AutoDsmSessionGetInput,
  success: AutoDsmSessionGetResult,
  error: AutoDsmRpcError,
});

export const WsAutodsmCreateSessionRpc = Rpc.make(WS_METHODS.autodsmCreateSession, {
  payload: AutoDsmSessionCreateInput,
  success: AutoDsmSessionCreateResult,
  error: AutoDsmRpcError,
});

export const WsAutodsmListChangeSetsForSessionRpc = Rpc.make(
  WS_METHODS.autodsmListChangeSetsForSession,
  {
    payload: AutoDsmSessionChangeSetListInput,
    success: AutoDsmSessionChangeSetListResult,
    error: AutoDsmRpcError,
  },
);

export const WsAutodsmPrepareSessionBranchRpc = Rpc.make(WS_METHODS.autodsmPrepareSessionBranch, {
  payload: AutoDsmGitSessionBranchInput,
  success: AutoDsmGitSessionBranchResult,
  error: AutoDsmRpcError,
});

export const WsAutodsmGetIssuesForPromptRpc = Rpc.make(WS_METHODS.autodsmGetIssuesForPrompt, {
  payload: AutoDsmIssuesForPromptInput,
  success: AutoDsmIssuesForPromptResult,
  error: AutoDsmRpcError,
});

export const WsAutodsmCreateWorkspaceRpc = Rpc.make(WS_METHODS.autodsmCreateWorkspace, {
  payload: AutoDsmCreateWorkspaceInput,
  success: AutoDsmCreateWorkspaceResult,
  error: AutoDsmRpcError,
});

export const WsAutodsmListWorkspaceHistoryRpc = Rpc.make(WS_METHODS.autodsmListWorkspaceHistory, {
  payload: AutoDsmListWorkspaceHistoryInput,
  success: AutoDsmListWorkspaceHistoryResult,
  error: AutoDsmRpcError,
});

export const WsAutodsmDeleteWorkspaceRpc = Rpc.make(WS_METHODS.autodsmDeleteWorkspace, {
  payload: AutoDsmDeleteWorkspaceInput,
  success: AutoDsmDeleteWorkspaceResult,
  error: AutoDsmRpcError,
});

export const WsShellOpenInEditorRpc = Rpc.make(WS_METHODS.shellOpenInEditor, {
  payload: LaunchEditorInput,
  error: ExternalLauncherError,
});

export const WsFilesystemBrowseRpc = Rpc.make(WS_METHODS.filesystemBrowse, {
  payload: FilesystemBrowseInput,
  success: FilesystemBrowseResult,
  error: FilesystemBrowseError,
});

export const WsSubscribeVcsStatusRpc = Rpc.make(WS_METHODS.subscribeVcsStatus, {
  payload: VcsStatusInput,
  success: VcsStatusStreamEvent,
  error: GitManagerServiceError,
  stream: true,
});

export const WsVcsPullRpc = Rpc.make(WS_METHODS.vcsPull, {
  payload: VcsPullInput,
  success: VcsPullResult,
  error: GitCommandError,
});

export const WsVcsRefreshStatusRpc = Rpc.make(WS_METHODS.vcsRefreshStatus, {
  payload: VcsStatusInput,
  success: VcsStatusResult,
  error: GitManagerServiceError,
});

export const WsGitRunStackedActionRpc = Rpc.make(WS_METHODS.gitRunStackedAction, {
  payload: GitRunStackedActionInput,
  success: GitActionProgressEvent,
  error: GitManagerServiceError,
  stream: true,
});

export const WsGitResolvePullRequestRpc = Rpc.make(WS_METHODS.gitResolvePullRequest, {
  payload: GitPullRequestRefInput,
  success: GitResolvePullRequestResult,
  error: GitManagerServiceError,
});

export const WsGitPreparePullRequestThreadRpc = Rpc.make(WS_METHODS.gitPreparePullRequestThread, {
  payload: GitPreparePullRequestThreadInput,
  success: GitPreparePullRequestThreadResult,
  error: GitManagerServiceError,
});

export const WsVcsListRefsRpc = Rpc.make(WS_METHODS.vcsListRefs, {
  payload: VcsListRefsInput,
  success: VcsListRefsResult,
  error: GitCommandError,
});

export const WsVcsCreateWorktreeRpc = Rpc.make(WS_METHODS.vcsCreateWorktree, {
  payload: VcsCreateWorktreeInput,
  success: VcsCreateWorktreeResult,
  error: GitCommandError,
});

export const WsVcsRemoveWorktreeRpc = Rpc.make(WS_METHODS.vcsRemoveWorktree, {
  payload: VcsRemoveWorktreeInput,
  error: GitCommandError,
});

export const WsVcsCreateRefRpc = Rpc.make(WS_METHODS.vcsCreateRef, {
  payload: VcsCreateRefInput,
  success: VcsCreateRefResult,
  error: GitCommandError,
});

export const WsVcsSwitchRefRpc = Rpc.make(WS_METHODS.vcsSwitchRef, {
  payload: VcsSwitchRefInput,
  success: VcsSwitchRefResult,
  error: GitCommandError,
});

export const WsVcsInitRpc = Rpc.make(WS_METHODS.vcsInit, {
  payload: VcsInitInput,
  error: VcsError,
});

export const WsTerminalOpenRpc = Rpc.make(WS_METHODS.terminalOpen, {
  payload: TerminalOpenInput,
  success: TerminalSessionSnapshot,
  error: TerminalError,
});

export const WsTerminalWriteRpc = Rpc.make(WS_METHODS.terminalWrite, {
  payload: TerminalWriteInput,
  error: TerminalError,
});

export const WsTerminalResizeRpc = Rpc.make(WS_METHODS.terminalResize, {
  payload: TerminalResizeInput,
  error: TerminalError,
});

export const WsTerminalClearRpc = Rpc.make(WS_METHODS.terminalClear, {
  payload: TerminalClearInput,
  error: TerminalError,
});

export const WsTerminalRestartRpc = Rpc.make(WS_METHODS.terminalRestart, {
  payload: TerminalRestartInput,
  success: TerminalSessionSnapshot,
  error: TerminalError,
});

export const WsTerminalCloseRpc = Rpc.make(WS_METHODS.terminalClose, {
  payload: TerminalCloseInput,
  error: TerminalError,
});

export const WsOrchestrationDispatchCommandRpc = Rpc.make(
  ORCHESTRATION_WS_METHODS.dispatchCommand,
  {
    payload: ClientOrchestrationCommand,
    success: OrchestrationRpcSchemas.dispatchCommand.output,
    error: OrchestrationDispatchCommandError,
  },
);

export const WsOrchestrationGetTurnDiffRpc = Rpc.make(ORCHESTRATION_WS_METHODS.getTurnDiff, {
  payload: OrchestrationGetTurnDiffInput,
  success: OrchestrationRpcSchemas.getTurnDiff.output,
  error: OrchestrationGetTurnDiffError,
});

export const WsOrchestrationGetFullThreadDiffRpc = Rpc.make(
  ORCHESTRATION_WS_METHODS.getFullThreadDiff,
  {
    payload: OrchestrationGetFullThreadDiffInput,
    success: OrchestrationRpcSchemas.getFullThreadDiff.output,
    error: OrchestrationGetFullThreadDiffError,
  },
);

export const WsOrchestrationReplayEventsRpc = Rpc.make(ORCHESTRATION_WS_METHODS.replayEvents, {
  payload: OrchestrationReplayEventsInput,
  success: OrchestrationRpcSchemas.replayEvents.output,
  error: OrchestrationReplayEventsError,
});

export const WsOrchestrationGetArchivedShellSnapshotRpc = Rpc.make(
  ORCHESTRATION_WS_METHODS.getArchivedShellSnapshot,
  {
    payload: OrchestrationRpcSchemas.getArchivedShellSnapshot.input,
    success: OrchestrationRpcSchemas.getArchivedShellSnapshot.output,
    error: OrchestrationGetSnapshotError,
  },
);

export const WsOrchestrationSubscribeShellRpc = Rpc.make(ORCHESTRATION_WS_METHODS.subscribeShell, {
  payload: OrchestrationRpcSchemas.subscribeShell.input,
  success: OrchestrationRpcSchemas.subscribeShell.output,
  error: OrchestrationGetSnapshotError,
  stream: true,
});

export const WsOrchestrationSubscribeThreadRpc = Rpc.make(
  ORCHESTRATION_WS_METHODS.subscribeThread,
  {
    payload: OrchestrationRpcSchemas.subscribeThread.input,
    success: OrchestrationRpcSchemas.subscribeThread.output,
    error: OrchestrationGetSnapshotError,
    stream: true,
  },
);

export const WsSubscribeTerminalEventsRpc = Rpc.make(WS_METHODS.subscribeTerminalEvents, {
  payload: Schema.Struct({}),
  success: TerminalEvent,
  stream: true,
});

export const WsSubscribeServerConfigRpc = Rpc.make(WS_METHODS.subscribeServerConfig, {
  payload: Schema.Struct({}),
  success: ServerConfigStreamEvent,
  error: Schema.Union([KeybindingsConfigError, ServerSettingsError]),
  stream: true,
});

export const WsSubscribeServerLifecycleRpc = Rpc.make(WS_METHODS.subscribeServerLifecycle, {
  payload: Schema.Struct({}),
  success: ServerLifecycleStreamEvent,
  stream: true,
});

export const WsSubscribeAuthAccessRpc = Rpc.make(WS_METHODS.subscribeAuthAccess, {
  payload: Schema.Struct({}),
  success: AuthAccessStreamEvent,
  stream: true,
});

export const WsRpcGroup = RpcGroup.make(
  WsServerGetConfigRpc,
  WsServerRefreshProvidersRpc,
  WsServerUpdateProviderRpc,
  WsServerUpsertKeybindingRpc,
  WsServerRemoveKeybindingRpc,
  WsServerGetSettingsRpc,
  WsServerUpdateSettingsRpc,
  WsServerDiscoverSourceControlRpc,
  WsServerGetTraceDiagnosticsRpc,
  WsServerGetProcessDiagnosticsRpc,
  WsServerGetProcessResourceHistoryRpc,
  WsServerSignalProcessRpc,
  WsSourceControlLookupRepositoryRpc,
  WsSourceControlCloneRepositoryRpc,
  WsSourceControlPublishRepositoryRpc,
  WsProjectsSearchEntriesRpc,
  WsProjectsWriteFileRpc,
  WsProjectsReadFileRpc,
  WsProjectsAnalyzeReactComponentRpc,
  WsProjectsBuildComponentPreviewRpc,
  WsAutodsmGetProjectProfileRpc,
  WsAutodsmGetBrandProfileRpc,
  WsAutodsmAddBrandTokenRpc,
  WsAutodsmRemoveBrandTokenRpc,
  WsAutodsmUpdateBrandTokenRpc,
  WsAutodsmResyncBrandTokensRpc,
  WsAutodsmGetWorkspacePreviewCssRpc,
  WsAutodsmGetComponentRegistryRpc,
  WsAutodsmRunWorkspaceBuildRpc,
  WsAutodsmGetComponentRegistryEntryRpc,
  WsAutodsmGetRenderEnvironmentProfileRpc,
  WsAutodsmGetRenderManifestRpc,
  WsAutodsmGetScanArtifactRpc,
  WsAutodsmSubscribeIndexingProgressRpc,
  WsAutodsmRunScanRpc,
  WsAutodsmBuildRenderPlanRpc,
  WsAutodsmExecuteRenderPlanRpc,
  WsAutodsmGetSidecarStatusRpc,
  WsAutodsmStartSidecarRpc,
  WsAutodsmGetProviderCatalogRpc,
  WsAutodsmChangeSetCreateRpc,
  WsAutodsmChangeSetPreviewRpc,
  WsAutodsmChangeSetApplyRpc,
  WsAutodsmChangeSetRollbackRpc,
  WsAutodsmAssembleGenerationPlanRpc,
  WsAutodsmExportPublishedExportRpc,
  WsAutodsmExportPublishedSnapshotRpc,
  WsAutodsmCreatePullRequestRpc,
  WsAutodsmListPullRequestsRpc,
  WsAutodsmListActivityRpc,
  WsAutodsmListComponentAgentsRpc,
  WsAutodsmRegisterComponentAgentRpc,
  WsAutodsmUpdateComponentAgentRpc,
  WsAutodsmRemoveComponentAgentRpc,
  WsAutodsmGetComponentConversationRpc,
  WsAutodsmAppendComponentConversationRpc,
  WsAutodsmGetSessionRpc,
  WsAutodsmCreateSessionRpc,
  WsAutodsmListChangeSetsForSessionRpc,
  WsAutodsmPrepareSessionBranchRpc,
  WsAutodsmGetIssuesForPromptRpc,
  WsAutodsmCreateWorkspaceRpc,
  WsAutodsmListWorkspaceHistoryRpc,
  WsAutodsmDeleteWorkspaceRpc,
  WsShellOpenInEditorRpc,
  WsFilesystemBrowseRpc,
  WsSubscribeVcsStatusRpc,
  WsVcsPullRpc,
  WsVcsRefreshStatusRpc,
  WsGitRunStackedActionRpc,
  WsGitResolvePullRequestRpc,
  WsGitPreparePullRequestThreadRpc,
  WsVcsListRefsRpc,
  WsVcsCreateWorktreeRpc,
  WsVcsRemoveWorktreeRpc,
  WsVcsCreateRefRpc,
  WsVcsSwitchRefRpc,
  WsVcsInitRpc,
  WsTerminalOpenRpc,
  WsTerminalWriteRpc,
  WsTerminalResizeRpc,
  WsTerminalClearRpc,
  WsTerminalRestartRpc,
  WsTerminalCloseRpc,
  WsSubscribeTerminalEventsRpc,
  WsSubscribeServerConfigRpc,
  WsSubscribeServerLifecycleRpc,
  WsSubscribeAuthAccessRpc,
  WsOrchestrationDispatchCommandRpc,
  WsOrchestrationGetTurnDiffRpc,
  WsOrchestrationGetFullThreadDiffRpc,
  WsOrchestrationReplayEventsRpc,
  WsOrchestrationGetArchivedShellSnapshotRpc,
  WsOrchestrationSubscribeShellRpc,
  WsOrchestrationSubscribeThreadRpc,
);
