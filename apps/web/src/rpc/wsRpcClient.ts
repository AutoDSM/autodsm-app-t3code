import {
  type GitActionProgressEvent,
  type GitRunStackedActionInput,
  type GitRunStackedActionResult,
  type VcsStatusResult,
  type VcsStatusStreamEvent,
  type LocalApi,
  ORCHESTRATION_WS_METHODS,
  type ServerSettingsPatch,
  WS_METHODS,
} from "@t3tools/contracts";
import { applyGitStatusStreamEvent } from "@t3tools/shared/git";
import * as Effect from "effect/Effect";
import * as Stream from "effect/Stream";

import { type WsRpcProtocolClient } from "./protocol";
import { resetWsReconnectBackoff } from "./wsConnectionState";
import { WsTransport } from "./wsTransport";

type RpcTag = keyof WsRpcProtocolClient & string;
type RpcMethod<TTag extends RpcTag> = WsRpcProtocolClient[TTag];
type RpcInput<TTag extends RpcTag> = Parameters<RpcMethod<TTag>>[0];

interface StreamSubscriptionOptions {
  readonly onResubscribe?: () => void;
}

type RpcUnaryMethod<TTag extends RpcTag> =
  RpcMethod<TTag> extends (input: any, options?: any) => Effect.Effect<infer TSuccess, any, any>
    ? (input: RpcInput<TTag>) => Promise<TSuccess>
    : never;

type RpcUnaryNoArgMethod<TTag extends RpcTag> =
  RpcMethod<TTag> extends (input: any, options?: any) => Effect.Effect<infer TSuccess, any, any>
    ? () => Promise<TSuccess>
    : never;

type RpcStreamMethod<TTag extends RpcTag> =
  RpcMethod<TTag> extends (input: any, options?: any) => Stream.Stream<infer TEvent, any, any>
    ? (listener: (event: TEvent) => void, options?: StreamSubscriptionOptions) => () => void
    : never;

type RpcInputStreamMethod<TTag extends RpcTag> =
  RpcMethod<TTag> extends (input: any, options?: any) => Stream.Stream<infer TEvent, any, any>
    ? (
        input: RpcInput<TTag>,
        listener: (event: TEvent) => void,
        options?: StreamSubscriptionOptions,
      ) => () => void
    : never;

interface GitRunStackedActionOptions {
  readonly onProgress?: (event: GitActionProgressEvent) => void;
}

export interface WsRpcClient {
  readonly dispose: () => Promise<void>;
  readonly reconnect: () => Promise<void>;
  readonly isHeartbeatFresh: () => boolean;
  readonly terminal: {
    readonly open: RpcUnaryMethod<typeof WS_METHODS.terminalOpen>;
    readonly write: RpcUnaryMethod<typeof WS_METHODS.terminalWrite>;
    readonly resize: RpcUnaryMethod<typeof WS_METHODS.terminalResize>;
    readonly clear: RpcUnaryMethod<typeof WS_METHODS.terminalClear>;
    readonly restart: RpcUnaryMethod<typeof WS_METHODS.terminalRestart>;
    readonly close: RpcUnaryMethod<typeof WS_METHODS.terminalClose>;
    readonly onEvent: RpcStreamMethod<typeof WS_METHODS.subscribeTerminalEvents>;
  };
  readonly projects: {
    readonly searchEntries: RpcUnaryMethod<typeof WS_METHODS.projectsSearchEntries>;
    readonly writeFile: RpcUnaryMethod<typeof WS_METHODS.projectsWriteFile>;
    readonly readFile: RpcUnaryMethod<typeof WS_METHODS.projectsReadFile>;
    readonly analyzeReactComponent: RpcUnaryMethod<typeof WS_METHODS.projectsAnalyzeReactComponent>;
    readonly buildComponentPreview: RpcUnaryMethod<typeof WS_METHODS.projectsBuildComponentPreview>;
  };
  readonly autodsm: {
    readonly getProjectProfile: RpcUnaryMethod<typeof WS_METHODS.autodsmGetProjectProfile>;
    readonly getBrandProfile: RpcUnaryMethod<typeof WS_METHODS.autodsmGetBrandProfile>;
    readonly addBrandToken: RpcUnaryMethod<typeof WS_METHODS.autodsmAddBrandToken>;
    readonly removeBrandToken: RpcUnaryMethod<typeof WS_METHODS.autodsmRemoveBrandToken>;
    readonly updateBrandToken: RpcUnaryMethod<typeof WS_METHODS.autodsmUpdateBrandToken>;
    readonly resyncBrandTokens: RpcUnaryMethod<typeof WS_METHODS.autodsmResyncBrandTokens>;
    readonly getWorkspacePreviewCss: RpcUnaryMethod<
      typeof WS_METHODS.autodsmGetWorkspacePreviewCss
    >;
    readonly getComponentRegistry: RpcUnaryMethod<typeof WS_METHODS.autodsmGetComponentRegistry>;
    readonly runWorkspaceBuild: RpcUnaryMethod<typeof WS_METHODS.autodsmRunWorkspaceBuild>;
    readonly getComponentRegistryEntry: RpcUnaryMethod<
      typeof WS_METHODS.autodsmGetComponentRegistryEntry
    >;
    readonly getRenderEnvironmentProfile: RpcUnaryMethod<
      typeof WS_METHODS.autodsmGetRenderEnvironmentProfile
    >;
    readonly getRenderManifest: RpcUnaryMethod<typeof WS_METHODS.autodsmGetRenderManifest>;
    readonly getScanArtifact: RpcUnaryMethod<typeof WS_METHODS.autodsmGetScanArtifact>;
    readonly subscribeIndexingProgress: RpcInputStreamMethod<
      typeof WS_METHODS.autodsmSubscribeIndexingProgress
    >;
    readonly runScan: RpcUnaryMethod<typeof WS_METHODS.autodsmRunScan>;
    readonly buildRenderPlan: RpcUnaryMethod<typeof WS_METHODS.autodsmBuildRenderPlan>;
    readonly executeRenderPlan: RpcUnaryMethod<typeof WS_METHODS.autodsmExecuteRenderPlan>;
    readonly getSidecarStatus: RpcUnaryMethod<typeof WS_METHODS.autodsmGetSidecarStatus>;
    readonly startSidecar: RpcUnaryMethod<typeof WS_METHODS.autodsmStartSidecar>;
    readonly getProviderCatalog: RpcUnaryNoArgMethod<typeof WS_METHODS.autodsmGetProviderCatalog>;
    readonly changeSetCreate: RpcUnaryMethod<typeof WS_METHODS.autodsmChangeSetCreate>;
    readonly changeSetPreview: RpcUnaryMethod<typeof WS_METHODS.autodsmChangeSetPreview>;
    readonly changeSetApply: RpcUnaryMethod<typeof WS_METHODS.autodsmChangeSetApply>;
    readonly changeSetRollback: RpcUnaryMethod<typeof WS_METHODS.autodsmChangeSetRollback>;
    readonly assembleGenerationPlan: RpcUnaryMethod<
      typeof WS_METHODS.autodsmAssembleGenerationPlan
    >;
    readonly exportPublishedSnapshot: RpcUnaryMethod<
      typeof WS_METHODS.autodsmExportPublishedSnapshot
    >;
    readonly exportPublishedExport: RpcUnaryMethod<typeof WS_METHODS.autodsmExportPublishedExport>;
    readonly createPullRequest: RpcUnaryMethod<typeof WS_METHODS.autodsmCreatePullRequest>;
    readonly listPullRequests: RpcUnaryMethod<typeof WS_METHODS.autodsmListPullRequests>;
    readonly listActivity: RpcUnaryMethod<typeof WS_METHODS.autodsmListActivity>;
    readonly listComponentAgents: RpcUnaryMethod<typeof WS_METHODS.autodsmListComponentAgents>;
    readonly registerComponentAgent: RpcUnaryMethod<
      typeof WS_METHODS.autodsmRegisterComponentAgent
    >;
    readonly updateComponentAgent: RpcUnaryMethod<typeof WS_METHODS.autodsmUpdateComponentAgent>;
    readonly getComponentConversation: RpcUnaryMethod<
      typeof WS_METHODS.autodsmGetComponentConversation
    >;
    readonly appendComponentConversation: RpcUnaryMethod<
      typeof WS_METHODS.autodsmAppendComponentConversation
    >;
    readonly getSession: RpcUnaryMethod<typeof WS_METHODS.autodsmGetSession>;
    readonly createSession: RpcUnaryMethod<typeof WS_METHODS.autodsmCreateSession>;
    readonly listChangeSetsForSession: RpcUnaryMethod<
      typeof WS_METHODS.autodsmListChangeSetsForSession
    >;
    readonly prepareSessionBranch: RpcUnaryMethod<typeof WS_METHODS.autodsmPrepareSessionBranch>;
    readonly getIssuesForPrompt: RpcUnaryMethod<typeof WS_METHODS.autodsmGetIssuesForPrompt>;
    readonly createWorkspace: RpcUnaryMethod<typeof WS_METHODS.autodsmCreateWorkspace>;
    readonly listWorkspaceHistory: RpcUnaryMethod<typeof WS_METHODS.autodsmListWorkspaceHistory>;
    readonly deleteWorkspace: RpcUnaryMethod<typeof WS_METHODS.autodsmDeleteWorkspace>;
  };
  readonly filesystem: {
    readonly browse: RpcUnaryMethod<typeof WS_METHODS.filesystemBrowse>;
  };
  readonly sourceControl: {
    readonly lookupRepository: RpcUnaryMethod<typeof WS_METHODS.sourceControlLookupRepository>;
    readonly cloneRepository: RpcUnaryMethod<typeof WS_METHODS.sourceControlCloneRepository>;
    readonly publishRepository: RpcUnaryMethod<typeof WS_METHODS.sourceControlPublishRepository>;
  };
  readonly shell: {
    readonly openInEditor: (input: {
      readonly cwd: Parameters<LocalApi["shell"]["openInEditor"]>[0];
      readonly editor: Parameters<LocalApi["shell"]["openInEditor"]>[1];
    }) => ReturnType<LocalApi["shell"]["openInEditor"]>;
  };
  readonly vcs: {
    readonly pull: RpcUnaryMethod<typeof WS_METHODS.vcsPull>;
    readonly refreshStatus: RpcUnaryMethod<typeof WS_METHODS.vcsRefreshStatus>;
    readonly onStatus: (
      input: RpcInput<typeof WS_METHODS.subscribeVcsStatus>,
      listener: (status: VcsStatusResult) => void,
      options?: StreamSubscriptionOptions,
    ) => () => void;
    readonly listRefs: RpcUnaryMethod<typeof WS_METHODS.vcsListRefs>;
    readonly createWorktree: RpcUnaryMethod<typeof WS_METHODS.vcsCreateWorktree>;
    readonly removeWorktree: RpcUnaryMethod<typeof WS_METHODS.vcsRemoveWorktree>;
    readonly createRef: RpcUnaryMethod<typeof WS_METHODS.vcsCreateRef>;
    readonly switchRef: RpcUnaryMethod<typeof WS_METHODS.vcsSwitchRef>;
    readonly init: RpcUnaryMethod<typeof WS_METHODS.vcsInit>;
  };
  /**
   * Git-specific workflows. Local repository mechanics live under `vcs`.
   */
  readonly git: {
    readonly runStackedAction: (
      input: GitRunStackedActionInput,
      options?: GitRunStackedActionOptions,
    ) => Promise<GitRunStackedActionResult>;
    readonly resolvePullRequest: RpcUnaryMethod<typeof WS_METHODS.gitResolvePullRequest>;
    readonly preparePullRequestThread: RpcUnaryMethod<
      typeof WS_METHODS.gitPreparePullRequestThread
    >;
  };
  readonly server: {
    readonly getConfig: RpcUnaryNoArgMethod<typeof WS_METHODS.serverGetConfig>;
    /**
     * Refresh provider snapshots. Pass `{ instanceId }` to refresh a single
     * configured instance; pass no argument (or `{}`) to refresh all.
     */
    readonly refreshProviders: (
      input?: RpcInput<typeof WS_METHODS.serverRefreshProviders>,
    ) => ReturnType<RpcUnaryMethod<typeof WS_METHODS.serverRefreshProviders>>;
    readonly updateProvider: RpcUnaryMethod<typeof WS_METHODS.serverUpdateProvider>;
    readonly upsertKeybinding: RpcUnaryMethod<typeof WS_METHODS.serverUpsertKeybinding>;
    readonly removeKeybinding: RpcUnaryMethod<typeof WS_METHODS.serverRemoveKeybinding>;
    readonly getSettings: RpcUnaryNoArgMethod<typeof WS_METHODS.serverGetSettings>;
    readonly updateSettings: (
      patch: ServerSettingsPatch,
    ) => ReturnType<RpcUnaryMethod<typeof WS_METHODS.serverUpdateSettings>>;
    readonly discoverSourceControl: RpcUnaryNoArgMethod<
      typeof WS_METHODS.serverDiscoverSourceControl
    >;
    readonly getTraceDiagnostics: RpcUnaryNoArgMethod<typeof WS_METHODS.serverGetTraceDiagnostics>;
    readonly getProcessDiagnostics: RpcUnaryNoArgMethod<
      typeof WS_METHODS.serverGetProcessDiagnostics
    >;
    readonly getProcessResourceHistory: RpcUnaryMethod<
      typeof WS_METHODS.serverGetProcessResourceHistory
    >;
    readonly signalProcess: RpcUnaryMethod<typeof WS_METHODS.serverSignalProcess>;
    readonly subscribeConfig: RpcStreamMethod<typeof WS_METHODS.subscribeServerConfig>;
    readonly subscribeLifecycle: RpcStreamMethod<typeof WS_METHODS.subscribeServerLifecycle>;
    readonly subscribeAuthAccess: RpcStreamMethod<typeof WS_METHODS.subscribeAuthAccess>;
  };
  readonly orchestration: {
    readonly dispatchCommand: RpcUnaryMethod<typeof ORCHESTRATION_WS_METHODS.dispatchCommand>;
    readonly getTurnDiff: RpcUnaryMethod<typeof ORCHESTRATION_WS_METHODS.getTurnDiff>;
    readonly getFullThreadDiff: RpcUnaryMethod<typeof ORCHESTRATION_WS_METHODS.getFullThreadDiff>;
    readonly getArchivedShellSnapshot: RpcUnaryNoArgMethod<
      typeof ORCHESTRATION_WS_METHODS.getArchivedShellSnapshot
    >;
    readonly subscribeShell: RpcStreamMethod<typeof ORCHESTRATION_WS_METHODS.subscribeShell>;
    readonly subscribeThread: RpcInputStreamMethod<typeof ORCHESTRATION_WS_METHODS.subscribeThread>;
  };
}

export function createWsRpcClient(transport: WsTransport): WsRpcClient {
  return {
    dispose: () => transport.dispose(),
    reconnect: async () => {
      resetWsReconnectBackoff();
      await transport.reconnect();
    },
    isHeartbeatFresh: () => transport.isHeartbeatFresh(),
    terminal: {
      open: (input) => transport.request((client) => client[WS_METHODS.terminalOpen](input)),
      write: (input) => transport.request((client) => client[WS_METHODS.terminalWrite](input)),
      resize: (input) => transport.request((client) => client[WS_METHODS.terminalResize](input)),
      clear: (input) => transport.request((client) => client[WS_METHODS.terminalClear](input)),
      restart: (input) => transport.request((client) => client[WS_METHODS.terminalRestart](input)),
      close: (input) => transport.request((client) => client[WS_METHODS.terminalClose](input)),
      onEvent: (listener, options) =>
        transport.subscribe((client) => client[WS_METHODS.subscribeTerminalEvents]({}), listener, {
          ...options,
          tag: WS_METHODS.subscribeTerminalEvents,
        }),
    },
    projects: {
      searchEntries: (input) =>
        transport.request((client) => client[WS_METHODS.projectsSearchEntries](input)),
      writeFile: (input) =>
        transport.request((client) => client[WS_METHODS.projectsWriteFile](input)),
      readFile: (input) =>
        transport.request((client) => client[WS_METHODS.projectsReadFile](input)),
      analyzeReactComponent: (input) =>
        transport.request((client) => client[WS_METHODS.projectsAnalyzeReactComponent](input)),
      buildComponentPreview: (input) =>
        transport.request((client) => client[WS_METHODS.projectsBuildComponentPreview](input)),
    },
    autodsm: {
      getProjectProfile: (input) =>
        transport.request((client) => client[WS_METHODS.autodsmGetProjectProfile](input)),
      getBrandProfile: (input) =>
        transport.request((client) => client[WS_METHODS.autodsmGetBrandProfile](input)),
      addBrandToken: (input) =>
        transport.request((client) => client[WS_METHODS.autodsmAddBrandToken](input)),
      removeBrandToken: (input) =>
        transport.request((client) => client[WS_METHODS.autodsmRemoveBrandToken](input)),
      updateBrandToken: (input) =>
        transport.request((client) => client[WS_METHODS.autodsmUpdateBrandToken](input)),
      resyncBrandTokens: (input) =>
        transport.request((client) => client[WS_METHODS.autodsmResyncBrandTokens](input)),
      getWorkspacePreviewCss: (input) =>
        transport.request((client) => client[WS_METHODS.autodsmGetWorkspacePreviewCss](input)),
      getComponentRegistry: (input) =>
        transport.request((client) => client[WS_METHODS.autodsmGetComponentRegistry](input)),
      runWorkspaceBuild: (input) =>
        transport.request((client) => client[WS_METHODS.autodsmRunWorkspaceBuild](input)),
      getComponentRegistryEntry: (input) =>
        transport.request((client) => client[WS_METHODS.autodsmGetComponentRegistryEntry](input)),
      getRenderEnvironmentProfile: (input) =>
        transport.request((client) => client[WS_METHODS.autodsmGetRenderEnvironmentProfile](input)),
      getRenderManifest: (input) =>
        transport.request((client) => client[WS_METHODS.autodsmGetRenderManifest](input)),
      getScanArtifact: (input) =>
        transport.request((client) => client[WS_METHODS.autodsmGetScanArtifact](input)),
      subscribeIndexingProgress: (input, listener, options) =>
        transport.subscribe(
          (client) => client[WS_METHODS.autodsmSubscribeIndexingProgress](input),
          listener,
          { ...options, tag: WS_METHODS.autodsmSubscribeIndexingProgress },
        ),
      runScan: (input) => transport.request((client) => client[WS_METHODS.autodsmRunScan](input)),
      buildRenderPlan: (input) =>
        transport.request((client) => client[WS_METHODS.autodsmBuildRenderPlan](input)),
      executeRenderPlan: (input) =>
        transport.request((client) => client[WS_METHODS.autodsmExecuteRenderPlan](input)),
      getSidecarStatus: (input) =>
        transport.request((client) => client[WS_METHODS.autodsmGetSidecarStatus](input)),
      startSidecar: (input) =>
        transport.request((client) => client[WS_METHODS.autodsmStartSidecar](input)),
      getProviderCatalog: () =>
        transport.request((client) => client[WS_METHODS.autodsmGetProviderCatalog]({})),
      changeSetCreate: (input) =>
        transport.request((client) => client[WS_METHODS.autodsmChangeSetCreate](input)),
      changeSetPreview: (input) =>
        transport.request((client) => client[WS_METHODS.autodsmChangeSetPreview](input)),
      changeSetApply: (input) =>
        transport.request((client) => client[WS_METHODS.autodsmChangeSetApply](input)),
      changeSetRollback: (input) =>
        transport.request((client) => client[WS_METHODS.autodsmChangeSetRollback](input)),
      assembleGenerationPlan: (input) =>
        transport.request((client) => client[WS_METHODS.autodsmAssembleGenerationPlan](input)),
      exportPublishedSnapshot: (input) =>
        transport.request((client) => client[WS_METHODS.autodsmExportPublishedSnapshot](input)),
      exportPublishedExport: (input) =>
        transport.request((client) => client[WS_METHODS.autodsmExportPublishedExport](input)),
      createPullRequest: (input) =>
        transport.request((client) => client[WS_METHODS.autodsmCreatePullRequest](input)),
      listPullRequests: (input) =>
        transport.request((client) => client[WS_METHODS.autodsmListPullRequests](input)),
      listActivity: (input) =>
        transport.request((client) => client[WS_METHODS.autodsmListActivity](input)),
      listComponentAgents: (input) =>
        transport.request((client) => client[WS_METHODS.autodsmListComponentAgents](input)),
      registerComponentAgent: (input) =>
        transport.request((client) => client[WS_METHODS.autodsmRegisterComponentAgent](input)),
      updateComponentAgent: (input) =>
        transport.request((client) => client[WS_METHODS.autodsmUpdateComponentAgent](input)),
      getComponentConversation: (input) =>
        transport.request((client) => client[WS_METHODS.autodsmGetComponentConversation](input)),
      appendComponentConversation: (input) =>
        transport.request((client) => client[WS_METHODS.autodsmAppendComponentConversation](input)),
      getSession: (input) =>
        transport.request((client) => client[WS_METHODS.autodsmGetSession](input)),
      createSession: (input) =>
        transport.request((client) => client[WS_METHODS.autodsmCreateSession](input)),
      listChangeSetsForSession: (input) =>
        transport.request((client) => client[WS_METHODS.autodsmListChangeSetsForSession](input)),
      prepareSessionBranch: (input) =>
        transport.request((client) => client[WS_METHODS.autodsmPrepareSessionBranch](input)),
      getIssuesForPrompt: (input) =>
        transport.request((client) => client[WS_METHODS.autodsmGetIssuesForPrompt](input)),
      createWorkspace: (input) =>
        transport.request((client) => client[WS_METHODS.autodsmCreateWorkspace](input)),
      listWorkspaceHistory: (input = {}) =>
        transport.request((client) => client[WS_METHODS.autodsmListWorkspaceHistory](input)),
      deleteWorkspace: (input) =>
        transport.request((client) => client[WS_METHODS.autodsmDeleteWorkspace](input)),
    },
    filesystem: {
      browse: (input) => transport.request((client) => client[WS_METHODS.filesystemBrowse](input)),
    },
    sourceControl: {
      lookupRepository: (input) =>
        transport.request((client) => client[WS_METHODS.sourceControlLookupRepository](input)),
      cloneRepository: (input) =>
        transport.request((client) => client[WS_METHODS.sourceControlCloneRepository](input)),
      publishRepository: (input) =>
        transport.request((client) => client[WS_METHODS.sourceControlPublishRepository](input)),
    },
    shell: {
      openInEditor: (input) =>
        transport.request((client) => client[WS_METHODS.shellOpenInEditor](input)),
    },
    vcs: {
      pull: (input) => transport.request((client) => client[WS_METHODS.vcsPull](input)),
      refreshStatus: (input) =>
        transport.request((client) => client[WS_METHODS.vcsRefreshStatus](input)),
      onStatus: (input, listener, options) => {
        let current: VcsStatusResult | null = null;
        return transport.subscribe(
          (client) => client[WS_METHODS.subscribeVcsStatus](input),
          (event: VcsStatusStreamEvent) => {
            current = applyGitStatusStreamEvent(current, event);
            listener(current);
          },
          { ...options, tag: WS_METHODS.subscribeVcsStatus },
        );
      },
      listRefs: (input) => transport.request((client) => client[WS_METHODS.vcsListRefs](input)),
      createWorktree: (input) =>
        transport.request((client) => client[WS_METHODS.vcsCreateWorktree](input)),
      removeWorktree: (input) =>
        transport.request((client) => client[WS_METHODS.vcsRemoveWorktree](input)),
      createRef: (input) => transport.request((client) => client[WS_METHODS.vcsCreateRef](input)),
      switchRef: (input) => transport.request((client) => client[WS_METHODS.vcsSwitchRef](input)),
      init: (input) => transport.request((client) => client[WS_METHODS.vcsInit](input)),
    },
    git: {
      runStackedAction: async (input, options) => {
        let result: GitRunStackedActionResult | null = null;

        await transport.requestStream(
          (client) => client[WS_METHODS.gitRunStackedAction](input),
          (event) => {
            options?.onProgress?.(event);
            if (event.kind === "action_finished") {
              result = event.result;
            }
          },
        );

        if (result) {
          return result;
        }

        throw new Error("Git action stream completed without a final result.");
      },
      resolvePullRequest: (input) =>
        transport.request((client) => client[WS_METHODS.gitResolvePullRequest](input)),
      preparePullRequestThread: (input) =>
        transport.request((client) => client[WS_METHODS.gitPreparePullRequestThread](input)),
    },
    server: {
      getConfig: () => transport.request((client) => client[WS_METHODS.serverGetConfig]({})),
      refreshProviders: (input) =>
        transport.request((client) => client[WS_METHODS.serverRefreshProviders](input ?? {})),
      updateProvider: (input) =>
        transport.request((client) => client[WS_METHODS.serverUpdateProvider](input)),
      upsertKeybinding: (input) =>
        transport.request((client) => client[WS_METHODS.serverUpsertKeybinding](input)),
      removeKeybinding: (input) =>
        transport.request((client) => client[WS_METHODS.serverRemoveKeybinding](input)),
      getSettings: () => transport.request((client) => client[WS_METHODS.serverGetSettings]({})),
      updateSettings: (patch) =>
        transport.request((client) => client[WS_METHODS.serverUpdateSettings]({ patch })),
      discoverSourceControl: () =>
        transport.request((client) => client[WS_METHODS.serverDiscoverSourceControl]({})),
      getTraceDiagnostics: () =>
        transport.request((client) =>
          client[WS_METHODS.serverGetTraceDiagnostics]({}).pipe(Effect.withTracerEnabled(false)),
        ),
      getProcessDiagnostics: () =>
        transport.request((client) =>
          client[WS_METHODS.serverGetProcessDiagnostics]({}).pipe(Effect.withTracerEnabled(false)),
        ),
      getProcessResourceHistory: (input) =>
        transport.request((client) =>
          client[WS_METHODS.serverGetProcessResourceHistory](input).pipe(
            Effect.withTracerEnabled(false),
          ),
        ),
      signalProcess: (input) =>
        transport.request((client) =>
          client[WS_METHODS.serverSignalProcess](input).pipe(Effect.withTracerEnabled(false)),
        ),
      subscribeConfig: (listener, options) =>
        transport.subscribe((client) => client[WS_METHODS.subscribeServerConfig]({}), listener, {
          ...options,
          tag: WS_METHODS.subscribeServerConfig,
        }),
      subscribeLifecycle: (listener, options) =>
        transport.subscribe((client) => client[WS_METHODS.subscribeServerLifecycle]({}), listener, {
          ...options,
          tag: WS_METHODS.subscribeServerLifecycle,
        }),
      subscribeAuthAccess: (listener, options) =>
        transport.subscribe((client) => client[WS_METHODS.subscribeAuthAccess]({}), listener, {
          ...options,
          tag: WS_METHODS.subscribeAuthAccess,
        }),
    },
    orchestration: {
      dispatchCommand: (input) =>
        transport.request((client) => client[ORCHESTRATION_WS_METHODS.dispatchCommand](input)),
      getTurnDiff: (input) =>
        transport.request((client) => client[ORCHESTRATION_WS_METHODS.getTurnDiff](input)),
      getFullThreadDiff: (input) =>
        transport.request((client) => client[ORCHESTRATION_WS_METHODS.getFullThreadDiff](input)),
      getArchivedShellSnapshot: () =>
        transport.request((client) =>
          client[ORCHESTRATION_WS_METHODS.getArchivedShellSnapshot]({}),
        ),
      subscribeShell: (listener, options) =>
        transport.subscribe(
          (client) => client[ORCHESTRATION_WS_METHODS.subscribeShell]({}),
          listener,
          { ...options, tag: ORCHESTRATION_WS_METHODS.subscribeShell },
        ),
      subscribeThread: (input, listener, options) =>
        transport.subscribe(
          (client) => client[ORCHESTRATION_WS_METHODS.subscribeThread](input),
          listener,
          { ...options, tag: ORCHESTRATION_WS_METHODS.subscribeThread },
        ),
    },
  };
}
