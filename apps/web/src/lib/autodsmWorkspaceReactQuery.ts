import { EnvironmentId, AutoDsmSessionId, AutoDsmChangeSetId } from "@t3tools/contracts";
import type {
  AutoDsmBrandProfile,
  AutoDsmBrandTokenDraft,
  AutoDsmBrandTokenPatch,
  AutoDsmComponentRegistry,
  AutoDsmProjectProfile,
  AutoDsmRenderEnvironmentProfile,
  AutoDsmSidecarStatusResult,
  AutoDsmChangeSet,
  AutoDsmPullRequest,
  AutoDsmPullRequestListResult,
  AutoDsmPublishedExport,
} from "@t3tools/contracts";
import { queryOptions } from "@tanstack/react-query";

import { ensureEnvironmentApi, readEnvironmentApi } from "~/environmentApi";

export const autodsmWorkspaceQueryKeys = {
  projectProfile: (environmentId: EnvironmentId | null, cwd: string | null) =>
    ["autodsm", "project-profile", environmentId ?? null, cwd ?? null] as const,
  brandProfile: (environmentId: EnvironmentId | null, cwd: string | null) =>
    ["autodsm", "brand-profile", environmentId ?? null, cwd ?? null] as const,
  componentRegistry: (environmentId: EnvironmentId | null, cwd: string | null) =>
    ["autodsm", "component-registry", environmentId ?? null, cwd ?? null] as const,
  sidecarStatus: (environmentId: EnvironmentId | null, cwd: string | null) =>
    ["autodsm", "sidecar-status", environmentId ?? null, cwd ?? null] as const,
  renderEnvironmentProfile: (environmentId: EnvironmentId | null, cwd: string | null) =>
    ["autodsm", "render-environment-profile", environmentId ?? null, cwd ?? null] as const,
  componentAgents: (environmentId: EnvironmentId | null, cwd: string | null) =>
    ["autodsm", "component-agents", environmentId ?? null, cwd ?? null] as const,
  activity: (environmentId: EnvironmentId | null, cwd: string | null) =>
    ["autodsm", "activity", environmentId ?? null, cwd ?? null] as const,
  pullRequests: (environmentId: EnvironmentId | null, cwd: string | null) =>
    ["autodsm", "pull-requests", environmentId ?? null, cwd ?? null] as const,
  sessionChangeSets: (
    environmentId: EnvironmentId | null,
    cwd: string | null,
    sessionId: string | null,
  ) =>
    [
      "autodsm",
      "session-changesets",
      environmentId ?? null,
      cwd ?? null,
      sessionId ?? null,
    ] as const,
};

function requireApi(environmentId: EnvironmentId) {
  const api = readEnvironmentApi(environmentId) ?? ensureEnvironmentApi(environmentId);
  if (!api) {
    throw new Error("Workspace unavailable.");
  }
  return api;
}

export function autodsmProjectProfileQueryOptions(input: {
  readonly environmentId: EnvironmentId | null;
  readonly cwd: string | null;
  readonly enabled?: boolean;
}) {
  return queryOptions({
    queryKey: autodsmWorkspaceQueryKeys.projectProfile(input.environmentId, input.cwd),
    queryFn: async (): Promise<AutoDsmProjectProfile> => {
      if (!input.cwd || !input.environmentId) {
        throw new Error("Project profile is unavailable.");
      }
      return requireApi(input.environmentId).autodsm.getProjectProfile({
        cwd: input.cwd,
      });
    },
    enabled: (input.enabled ?? true) && input.environmentId !== null && input.cwd !== null,
    staleTime: 60_000,
  });
}

export function autodsmBrandProfileQueryOptions(input: {
  readonly environmentId: EnvironmentId | null;
  readonly cwd: string | null;
  readonly enabled?: boolean;
}) {
  return queryOptions({
    queryKey: autodsmWorkspaceQueryKeys.brandProfile(input.environmentId, input.cwd),
    queryFn: async (): Promise<AutoDsmBrandProfile> => {
      if (!input.cwd || !input.environmentId) {
        throw new Error("Brand profile is unavailable.");
      }
      return requireApi(input.environmentId).autodsm.getBrandProfile({ cwd: input.cwd });
    },
    enabled: (input.enabled ?? true) && input.environmentId !== null && input.cwd !== null,
    staleTime: 60_000,
  });
}

/** Add a user-defined brand token; resolves with the updated profile. */
export async function autodsmAddBrandToken(input: {
  readonly environmentId: EnvironmentId;
  readonly cwd: string;
  readonly token: AutoDsmBrandTokenDraft;
}): Promise<AutoDsmBrandProfile> {
  return requireApi(input.environmentId).autodsm.addBrandToken({
    cwd: input.cwd,
    token: input.token,
  });
}

/** Remove a brand token by id; resolves with the updated profile. */
export async function autodsmRemoveBrandToken(input: {
  readonly environmentId: EnvironmentId;
  readonly cwd: string;
  readonly tokenId: string;
}): Promise<AutoDsmBrandProfile> {
  return requireApi(input.environmentId).autodsm.removeBrandToken({
    cwd: input.cwd,
    tokenId: input.tokenId,
  });
}

/** Update an existing brand token; resolves with the updated profile. */
export async function autodsmUpdateBrandToken(input: {
  readonly environmentId: EnvironmentId;
  readonly cwd: string;
  readonly tokenId: string;
  readonly patch: AutoDsmBrandTokenPatch;
}): Promise<AutoDsmBrandProfile> {
  return requireApi(input.environmentId).autodsm.updateBrandToken({
    cwd: input.cwd,
    tokenId: input.tokenId,
    patch: input.patch,
  });
}

/** Re-extract scanned tokens from the installed design system. */
export async function autodsmResyncBrandTokens(input: {
  readonly environmentId: EnvironmentId;
  readonly cwd: string;
  readonly forceReseed?: boolean;
}): Promise<AutoDsmBrandProfile> {
  return requireApi(input.environmentId).autodsm.resyncBrandTokens({
    cwd: input.cwd,
    forceReseed: input.forceReseed,
  });
}

export function autodsmComponentRegistryQueryOptions(input: {
  readonly environmentId: EnvironmentId | null;
  readonly cwd: string | null;
  readonly enabled?: boolean;
}) {
  return queryOptions({
    queryKey: autodsmWorkspaceQueryKeys.componentRegistry(input.environmentId, input.cwd),
    queryFn: async (): Promise<AutoDsmComponentRegistry> => {
      if (!input.cwd || !input.environmentId) {
        throw new Error("Component registry is unavailable.");
      }
      return requireApi(input.environmentId).autodsm.getComponentRegistry({
        cwd: input.cwd,
      });
    },
    enabled: (input.enabled ?? true) && input.environmentId !== null && input.cwd !== null,
    staleTime: 60_000,
  });
}

export function autodsmSidecarStatusQueryOptions(input: {
  readonly environmentId: EnvironmentId | null;
  readonly cwd: string | null;
  readonly enabled?: boolean;
}) {
  return queryOptions({
    queryKey: autodsmWorkspaceQueryKeys.sidecarStatus(input.environmentId, input.cwd),
    queryFn: async (): Promise<AutoDsmSidecarStatusResult> => {
      if (!input.cwd || !input.environmentId) {
        throw new Error("Sidecar status is unavailable.");
      }
      return requireApi(input.environmentId).autodsm.getSidecarStatus({
        cwd: input.cwd,
      });
    },
    enabled: (input.enabled ?? true) && input.environmentId !== null && input.cwd !== null,
    staleTime: 15_000,
  });
}

export function autodsmRenderEnvironmentProfileQueryOptions(input: {
  readonly environmentId: EnvironmentId | null;
  readonly cwd: string | null;
  readonly enabled?: boolean;
}) {
  return queryOptions({
    queryKey: autodsmWorkspaceQueryKeys.renderEnvironmentProfile(input.environmentId, input.cwd),
    queryFn: async (): Promise<AutoDsmRenderEnvironmentProfile> => {
      if (!input.cwd || !input.environmentId) {
        throw new Error("Render environment profile is unavailable.");
      }
      return requireApi(input.environmentId).autodsm.getRenderEnvironmentProfile({
        cwd: input.cwd,
      });
    },
    enabled: (input.enabled ?? true) && input.environmentId !== null && input.cwd !== null,
    staleTime: 60_000,
  });
}

export function autodsmComponentAgentsQueryOptions(input: {
  readonly environmentId: EnvironmentId | null;
  readonly cwd: string | null;
  readonly enabled?: boolean;
}) {
  return queryOptions({
    queryKey: autodsmWorkspaceQueryKeys.componentAgents(input.environmentId, input.cwd),
    queryFn: async () => {
      if (!input.cwd || !input.environmentId) {
        throw new Error("Component agents are unavailable.");
      }
      return requireApi(input.environmentId).autodsm.listComponentAgents({ cwd: input.cwd });
    },
    enabled: (input.enabled ?? true) && input.environmentId !== null && input.cwd !== null,
    staleTime: 30_000,
  });
}

export function autodsmActivityQueryOptions(input: {
  readonly environmentId: EnvironmentId | null;
  readonly cwd: string | null;
  readonly enabled?: boolean;
  readonly limit?: number;
}) {
  return queryOptions({
    queryKey: [
      ...autodsmWorkspaceQueryKeys.activity(input.environmentId, input.cwd),
      input.limit ?? 50,
    ],
    queryFn: async () => {
      if (!input.cwd || !input.environmentId) {
        throw new Error("Activity log is unavailable.");
      }
      return requireApi(input.environmentId).autodsm.listActivity({
        cwd: input.cwd,
        ...(input.limit !== undefined ? { limit: input.limit } : {}),
      });
    },
    enabled: (input.enabled ?? true) && input.environmentId !== null && input.cwd !== null,
    staleTime: 30_000,
  });
}

export function autodsmPullRequestsQueryOptions(input: {
  readonly environmentId: EnvironmentId | null;
  readonly cwd: string | null;
  readonly enabled?: boolean;
}) {
  return queryOptions({
    queryKey: autodsmWorkspaceQueryKeys.pullRequests(input.environmentId, input.cwd),
    queryFn: async (): Promise<AutoDsmPullRequestListResult> => {
      if (!input.cwd || !input.environmentId) {
        throw new Error("Pull requests are unavailable.");
      }
      return requireApi(input.environmentId).autodsm.listPullRequests({ cwd: input.cwd });
    },
    enabled: (input.enabled ?? true) && input.environmentId !== null && input.cwd !== null,
    staleTime: 10_000,
  });
}

export function autodsmSessionChangeSetsQueryOptions(input: {
  readonly environmentId: EnvironmentId | null;
  readonly cwd: string | null;
  readonly sessionId: string | null;
  readonly enabled?: boolean;
}) {
  return queryOptions({
    queryKey: autodsmWorkspaceQueryKeys.sessionChangeSets(
      input.environmentId,
      input.cwd,
      input.sessionId,
    ),
    queryFn: async (): Promise<{ readonly changeSets: readonly AutoDsmChangeSet[] }> => {
      if (!input.cwd || !input.environmentId || !input.sessionId) {
        throw new Error("ChangeSets are unavailable.");
      }
      return requireApi(input.environmentId).autodsm.listChangeSetsForSession({
        cwd: input.cwd,
        sessionId: AutoDsmSessionId.make(input.sessionId),
      });
    },
    enabled:
      (input.enabled ?? true) &&
      input.environmentId !== null &&
      input.cwd !== null &&
      input.sessionId !== null,
    staleTime: 5_000,
  });
}

export async function autodsmCreatePullRequest(input: {
  readonly environmentId: EnvironmentId;
  readonly cwd: string;
  readonly title: string;
  readonly summary?: string;
  readonly changeSetIds: string[];
}): Promise<AutoDsmPullRequest> {
  const result = await requireApi(input.environmentId).autodsm.createPullRequest({
    cwd: input.cwd,
    title: input.title,
    summary: input.summary,
    changeSetIds: input.changeSetIds.map((id) => AutoDsmChangeSetId.make(id)),
  });
  return result.pullRequest;
}

export async function autodsmExportPublishedExport(input: {
  readonly environmentId: EnvironmentId;
  readonly cwd: string;
  readonly version?: string;
  readonly registryUrl?: string;
  readonly authToken?: string;
}): Promise<AutoDsmPublishedExport> {
  const result = await requireApi(input.environmentId).autodsm.exportPublishedExport({
    cwd: input.cwd,
    version: input.version,
    registryUrl: input.registryUrl,
    authToken: input.authToken,
  });
  return result.publishedExport;
}
