import type { EnvironmentId, EnvironmentApi } from "@t3tools/contracts";

import type { WsRpcClient } from "./rpc/wsRpcClient";
import { readEnvironmentConnection } from "./environments/runtime";

const environmentApiOverridesForTests = new Map<EnvironmentId, EnvironmentApi>();

export function createEnvironmentApi(rpcClient: WsRpcClient): EnvironmentApi {
  return {
    terminal: {
      open: (input) => rpcClient.terminal.open(input as never),
      write: (input) => rpcClient.terminal.write(input as never),
      resize: (input) => rpcClient.terminal.resize(input as never),
      clear: (input) => rpcClient.terminal.clear(input as never),
      restart: (input) => rpcClient.terminal.restart(input as never),
      close: (input) => rpcClient.terminal.close(input as never),
      onEvent: (callback) => rpcClient.terminal.onEvent(callback),
    },
    projects: {
      searchEntries: rpcClient.projects.searchEntries,
      writeFile: rpcClient.projects.writeFile,
      readFile: rpcClient.projects.readFile,
      analyzeReactComponent: rpcClient.projects.analyzeReactComponent,
      buildComponentPreview: rpcClient.projects.buildComponentPreview,
      buildComponentVariantShowcase: rpcClient.projects.buildComponentVariantShowcase,
    },
    autodsm: {
      getProjectProfile: rpcClient.autodsm.getProjectProfile,
      getBrandProfile: rpcClient.autodsm.getBrandProfile,
      addBrandToken: rpcClient.autodsm.addBrandToken,
      removeBrandToken: rpcClient.autodsm.removeBrandToken,
      updateBrandToken: rpcClient.autodsm.updateBrandToken,
      resyncBrandTokens: rpcClient.autodsm.resyncBrandTokens,
      uploadDesignBrief: rpcClient.autodsm.uploadDesignBrief,
      proposeDesignBrief: rpcClient.autodsm.proposeDesignBrief,
      applyDesignBriefProposal: rpcClient.autodsm.applyDesignBriefProposal,
      getDesignBrief: rpcClient.autodsm.getDesignBrief,
      installIconLibrary: rpcClient.autodsm.installIconLibrary,
      getWorkspacePreviewCss: rpcClient.autodsm.getWorkspacePreviewCss,
      getComponentRegistry: rpcClient.autodsm.getComponentRegistry,
      runWorkspaceBuild: rpcClient.autodsm.runWorkspaceBuild,
      getComponentRegistryEntry: rpcClient.autodsm.getComponentRegistryEntry,
      getRenderEnvironmentProfile: rpcClient.autodsm.getRenderEnvironmentProfile,
      getRenderManifest: rpcClient.autodsm.getRenderManifest,
      getScanArtifact: rpcClient.autodsm.getScanArtifact,
      subscribeIndexingProgress: (input, callback, options) =>
        rpcClient.autodsm.subscribeIndexingProgress(input, callback, options),
      runScan: rpcClient.autodsm.runScan,
      buildRenderPlan: rpcClient.autodsm.buildRenderPlan,
      executeRenderPlan: rpcClient.autodsm.executeRenderPlan,
      getSidecarStatus: rpcClient.autodsm.getSidecarStatus,
      startSidecar: rpcClient.autodsm.startSidecar,
      getProviderCatalog: rpcClient.autodsm.getProviderCatalog,
      changeSetCreate: rpcClient.autodsm.changeSetCreate,
      changeSetPreview: rpcClient.autodsm.changeSetPreview,
      changeSetApply: rpcClient.autodsm.changeSetApply,
      changeSetRollback: rpcClient.autodsm.changeSetRollback,
      changeSetCreateFromTurnDiff: rpcClient.autodsm.changeSetCreateFromTurnDiff,
      changeSetSetHunkDecisions: rpcClient.autodsm.changeSetSetHunkDecisions,
      changeSetApplyDecisions: rpcClient.autodsm.changeSetApplyDecisions,
      assembleGenerationPlan: rpcClient.autodsm.assembleGenerationPlan,
      exportPublishedSnapshot: rpcClient.autodsm.exportPublishedSnapshot,
      exportPublishedExport: rpcClient.autodsm.exportPublishedExport,
      createPullRequest: rpcClient.autodsm.createPullRequest,
      listPullRequests: rpcClient.autodsm.listPullRequests,
      listActivity: rpcClient.autodsm.listActivity,
      listComponentAgents: rpcClient.autodsm.listComponentAgents,
      registerComponentAgent: rpcClient.autodsm.registerComponentAgent,
      updateComponentAgent: rpcClient.autodsm.updateComponentAgent,
      removeComponentAgent: rpcClient.autodsm.removeComponentAgent,
      resyncComponentAgents: rpcClient.autodsm.resyncComponentAgents,
      getComponentConversation: rpcClient.autodsm.getComponentConversation,
      appendComponentConversation: rpcClient.autodsm.appendComponentConversation,
      getSession: rpcClient.autodsm.getSession,
      createSession: rpcClient.autodsm.createSession,
      listChangeSetsForSession: rpcClient.autodsm.listChangeSetsForSession,
      prepareSessionBranch: rpcClient.autodsm.prepareSessionBranch,
      getIssuesForPrompt: rpcClient.autodsm.getIssuesForPrompt,
      createWorkspace: rpcClient.autodsm.createWorkspace,
      listWorkspaceHistory: (input) => rpcClient.autodsm.listWorkspaceHistory(input ?? {}),
      deleteWorkspace: rpcClient.autodsm.deleteWorkspace,
    },
    filesystem: {
      browse: rpcClient.filesystem.browse,
    },
    sourceControl: {
      lookupRepository: rpcClient.sourceControl.lookupRepository,
      cloneRepository: rpcClient.sourceControl.cloneRepository,
      publishRepository: rpcClient.sourceControl.publishRepository,
    },
    vcs: {
      pull: rpcClient.vcs.pull,
      refreshStatus: rpcClient.vcs.refreshStatus,
      onStatus: (input, callback, options) => rpcClient.vcs.onStatus(input, callback, options),
      listRefs: rpcClient.vcs.listRefs,
      createWorktree: rpcClient.vcs.createWorktree,
      removeWorktree: rpcClient.vcs.removeWorktree,
      createRef: rpcClient.vcs.createRef,
      switchRef: rpcClient.vcs.switchRef,
      init: rpcClient.vcs.init,
    },
    git: {
      resolvePullRequest: rpcClient.git.resolvePullRequest,
      preparePullRequestThread: rpcClient.git.preparePullRequestThread,
    },
    orchestration: {
      dispatchCommand: rpcClient.orchestration.dispatchCommand,
      getTurnDiff: rpcClient.orchestration.getTurnDiff,
      getFullThreadDiff: rpcClient.orchestration.getFullThreadDiff,
      getArchivedShellSnapshot: rpcClient.orchestration.getArchivedShellSnapshot,
      subscribeShell: (callback, options) =>
        rpcClient.orchestration.subscribeShell(callback, options),
      subscribeThread: (input, callback, options) =>
        rpcClient.orchestration.subscribeThread(input, callback, options),
    },
  };
}

export function readEnvironmentApi(environmentId: EnvironmentId): EnvironmentApi | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  if (!environmentId) {
    return undefined;
  }

  const overriddenApi = environmentApiOverridesForTests.get(environmentId);
  if (overriddenApi) {
    return overriddenApi;
  }

  const connection = readEnvironmentConnection(environmentId);
  return connection ? createEnvironmentApi(connection.client) : undefined;
}

export function ensureEnvironmentApi(environmentId: EnvironmentId): EnvironmentApi {
  const api = readEnvironmentApi(environmentId);
  if (!api) {
    throw new Error(`Environment API not found for environment ${environmentId}`);
  }
  return api;
}

export function __setEnvironmentApiOverrideForTests(
  environmentId: EnvironmentId,
  api: EnvironmentApi,
): void {
  environmentApiOverridesForTests.set(environmentId, api);
}

export function __resetEnvironmentApiOverridesForTests(): void {
  environmentApiOverridesForTests.clear();
}
