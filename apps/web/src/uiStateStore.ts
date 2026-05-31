import type {
  AutoDsmViewportSpec,
  EnvironmentId,
  ProjectId,
  ScopedProjectRef,
} from "@t3tools/contracts";
import { Debouncer } from "@tanstack/react-pacer";
import { create } from "zustand";

import {
  defaultAutodsmOnboardingState,
  mergeAutodsmOnboarding,
  sanitizeAutodsmOnboarding,
  type AutoDsmOnboardingState,
} from "./lib/autoDsmOnboarding";
import { canonicalAutoDsmComponentPreviewPaths } from "./lib/autoDsmComponentPreviewPath";
import {
  AUTODSM_DEFAULT_CHAT_LAYOUT,
  AUTODSM_DEFAULT_VIEWPORT,
  sanitizeChatLayout,
  sanitizeViewportSpec,
  type AutoDsmChatLayoutSpec,
} from "./lib/autoDsmViewportPresets";

export const PERSISTED_STATE_KEY = "t3code:ui-state:v1";
const LEGACY_PERSISTED_STATE_KEYS = [
  "t3code:renderer-state:v8",
  "t3code:renderer-state:v7",
  "t3code:renderer-state:v6",
  "t3code:renderer-state:v5",
  "t3code:renderer-state:v4",
  "t3code:renderer-state:v3",
  "codething:renderer-state:v4",
  "codething:renderer-state:v3",
  "codething:renderer-state:v2",
  "codething:renderer-state:v1",
] as const;

export interface PersistedUiState {
  collapsedProjectCwds?: string[];
  expandedProjectCwds?: string[];
  projectOrderCwds?: string[];
  defaultAdvertisedEndpointKey?: string | null;
  threadChangedFilesExpandedById?: Record<string, Record<string, boolean>>;
  /** Folder opened from AutoDSM launch (Open folder / clone intake). */
  autoDsmWorkspaceProjectRef?: {
    readonly environmentId: string;
    readonly projectId: string;
  } | null;
  /** AutoDSM product onboarding wizard (fake auth + starter selection until real fork ships). */
  autodsmOnboarding?: AutoDsmOnboardingState;
  /**
   * Thread id → workspace-relative preview path (`src/components/...`), seeded by
   * `autodsm.createWorkspace` for COMPONENTS-as-threads navigation.
   */
  autoDsmThreadComponentPathById?: Record<string, string>;
  /** Collapsed component-agent sidebar folders keyed by workspace cwd. */
  autoDsmComponentAgentGroupCollapsedByWorkspaceKey?: Record<string, Record<string, true>>;
  /** Per-workspace active viewport preset for the preview canvas. */
  autoDsmActiveViewportByWorkspace?: Record<string, AutoDsmViewportSpec>;
  /** Per-thread viewport override; falls back to workspace default when absent. */
  autoDsmActiveViewportByThreadKey?: Record<string, AutoDsmViewportSpec>;
  /** Per-workspace 3-column chat shell layout. */
  autoDsmChatLayoutByWorkspace?: Record<string, AutoDsmChatLayoutSpec>;
}

export interface UiProjectState {
  projectExpandedById: Record<string, boolean>;
  projectOrder: string[];
}

export interface UiThreadState {
  threadLastVisitedAtById: Record<string, string>;
  threadChangedFilesExpandedById: Record<string, Record<string, boolean>>;
}

export interface UiEndpointState {
  defaultAdvertisedEndpointKey: string | null;
}

export interface UiAutoDsmWorkspaceState {
  /**
   * Explicit AutoDSM product workspace (launch-page folder choice).
   * When null, AutoDSM surfaces fall back to route/thread or sidebar ordering.
   */
  autoDsmWorkspaceProjectRef: ScopedProjectRef | null;
}

export interface UiState
  extends UiProjectState, UiThreadState, UiEndpointState, UiAutoDsmWorkspaceState {
  autodsmOnboarding: AutoDsmOnboardingState;
  /**
   * Markdown captured during the optional `/onboarding/brief` step, held
   * here because the workspace doesn't yet have a `cwd` at that point. When
   * the user lands in the Design Tokens workspace post-onboarding, this is
   * uploaded + proposed against the freshly created workspace, then cleared.
   */
  pendingDesignBriefMarkdown: string | null;
  /** Maps scoped thread key → `src/components/...` path for AutoDSM preview search params. */
  autoDsmThreadComponentPathById: Record<string, string>;
  /** Workspace cwd → group id → expanded (default true when missing). */
  autoDsmComponentAgentGroupExpandedByWorkspaceKey: Record<string, Record<string, boolean>>;
  /** Workspace key (scoped project) → active viewport preset for the preview canvas. */
  autoDsmActiveViewportByWorkspace: Record<string, AutoDsmViewportSpec>;
  /** Scoped thread key → viewport override; takes precedence over workspace default. */
  autoDsmActiveViewportByThreadKey: Record<string, AutoDsmViewportSpec>;
  /** Workspace key → 3-column chat shell layout. */
  autoDsmChatLayoutByWorkspace: Record<string, AutoDsmChatLayoutSpec>;
}

export interface SyncProjectInput {
  /** Physical project key (env + cwd). Used for manual sort order. */
  key: string;
  /** Logical group key. Used for expand/collapse state. */
  logicalKey: string;
  cwd: string;
  environmentId: EnvironmentId;
  projectId: ProjectId;
}

export interface SyncThreadInput {
  key: string;
  seedVisitedAt?: string | undefined;
}

const initialState: UiState = {
  projectExpandedById: {},
  projectOrder: [],
  threadLastVisitedAtById: {},
  threadChangedFilesExpandedById: {},
  defaultAdvertisedEndpointKey: null,
  autoDsmWorkspaceProjectRef: null,
  autodsmOnboarding: defaultAutodsmOnboardingState,
  pendingDesignBriefMarkdown: null,
  autoDsmThreadComponentPathById: {},
  autoDsmComponentAgentGroupExpandedByWorkspaceKey: {},
  autoDsmActiveViewportByWorkspace: {},
  autoDsmActiveViewportByThreadKey: {},
  autoDsmChatLayoutByWorkspace: {},
};

const persistedCollapsedProjectCwds = new Set<string>();
const persistedExpandedProjectCwds = new Set<string>();
const persistedProjectOrderCwds: string[] = [];
// Pre-fix persisted shape only listed expanded cwds, so anything not listed
// was treated as collapsed. Track whether the loaded blob carried the new
// `collapsedProjectCwds` field so we can preserve that legacy semantic for
// one session after upgrade, until persistState rewrites in the new shape.
let persistedProjectStateUsesLegacyShape = false;
const currentProjectCwdById = new Map<string, string>();
const currentProjectCwdsByLogicalKey = new Map<string, string[]>();
const currentLogicalKeyByPhysicalKey = new Map<string, string>();
let legacyKeysCleanedUp = false;

function readPersistedState(): UiState {
  if (typeof window === "undefined") {
    return initialState;
  }
  try {
    const raw = window.localStorage.getItem(PERSISTED_STATE_KEY);
    if (!raw) {
      for (const legacyKey of LEGACY_PERSISTED_STATE_KEYS) {
        const legacyRaw = window.localStorage.getItem(legacyKey);
        if (!legacyRaw) {
          continue;
        }
        hydratePersistedProjectState(JSON.parse(legacyRaw) as PersistedUiState);
        return initialState;
      }
      return initialState;
    }
    const parsed = JSON.parse(raw) as PersistedUiState;
    hydratePersistedProjectState(parsed);
    const persistedAutoDsm =
      parsed.autoDsmWorkspaceProjectRef &&
      typeof parsed.autoDsmWorkspaceProjectRef.environmentId === "string" &&
      parsed.autoDsmWorkspaceProjectRef.environmentId.length > 0 &&
      typeof parsed.autoDsmWorkspaceProjectRef.projectId === "string" &&
      parsed.autoDsmWorkspaceProjectRef.projectId.length > 0
        ? {
            environmentId: parsed.autoDsmWorkspaceProjectRef.environmentId as EnvironmentId,
            projectId: parsed.autoDsmWorkspaceProjectRef.projectId as ProjectId,
          }
        : null;
    const persistedOnboarding =
      sanitizeAutodsmOnboarding(parsed.autodsmOnboarding) ?? defaultAutodsmOnboardingState;
    const persistedPreviewPaths = sanitizeAutoDsmThreadComponentPathById(
      parsed.autoDsmThreadComponentPathById,
    );
    const persistedGroupExpanded = sanitizeAutoDsmComponentAgentGroupExpandedByWorkspaceKey(
      parsed.autoDsmComponentAgentGroupCollapsedByWorkspaceKey,
    );
    return {
      ...initialState,
      defaultAdvertisedEndpointKey:
        typeof parsed.defaultAdvertisedEndpointKey === "string" &&
        parsed.defaultAdvertisedEndpointKey.length > 0
          ? parsed.defaultAdvertisedEndpointKey
          : null,
      threadChangedFilesExpandedById: sanitizePersistedThreadChangedFilesExpanded(
        parsed.threadChangedFilesExpandedById,
      ),
      autoDsmWorkspaceProjectRef: persistedAutoDsm,
      autodsmOnboarding: persistedOnboarding,
      autoDsmThreadComponentPathById: persistedPreviewPaths,
      autoDsmComponentAgentGroupExpandedByWorkspaceKey: persistedGroupExpanded,
      autoDsmActiveViewportByWorkspace: sanitizeViewportRecord(
        parsed.autoDsmActiveViewportByWorkspace,
      ),
      autoDsmActiveViewportByThreadKey: sanitizeViewportRecord(
        parsed.autoDsmActiveViewportByThreadKey,
      ),
      autoDsmChatLayoutByWorkspace: sanitizeChatLayoutRecord(parsed.autoDsmChatLayoutByWorkspace),
    };
  } catch {
    return initialState;
  }
}

function sanitizeViewportRecord(value: unknown): Record<string, AutoDsmViewportSpec> {
  if (!value || typeof value !== "object") return {};
  const next: Record<string, AutoDsmViewportSpec> = {};
  for (const [key, spec] of Object.entries(value as Record<string, unknown>)) {
    if (typeof key !== "string" || key.length === 0) continue;
    const sanitized = sanitizeViewportSpec(spec);
    if (sanitized) next[key] = sanitized;
  }
  return next;
}

function sanitizeChatLayoutRecord(value: unknown): Record<string, AutoDsmChatLayoutSpec> {
  if (!value || typeof value !== "object") return {};
  const next: Record<string, AutoDsmChatLayoutSpec> = {};
  for (const [key, layout] of Object.entries(value as Record<string, unknown>)) {
    if (typeof key !== "string" || key.length === 0) continue;
    const sanitized = sanitizeChatLayout(layout);
    if (sanitized) next[key] = sanitized;
  }
  return next;
}

function sanitizeAutoDsmThreadComponentPathById(
  value: PersistedUiState["autoDsmThreadComponentPathById"],
): Record<string, string> {
  if (!value || typeof value !== "object") {
    return {};
  }
  const next: Record<string, string> = {};
  for (const [threadId, path] of Object.entries(value)) {
    if (
      typeof threadId === "string" &&
      threadId.length > 0 &&
      typeof path === "string" &&
      path.length > 0
    ) {
      next[threadId] = path;
    }
  }
  return next;
}

function sanitizeAutoDsmComponentAgentGroupExpandedByWorkspaceKey(
  value: PersistedUiState["autoDsmComponentAgentGroupCollapsedByWorkspaceKey"],
): Record<string, Record<string, boolean>> {
  if (!value || typeof value !== "object") {
    return {};
  }
  const next: Record<string, Record<string, boolean>> = {};
  for (const [workspaceKey, groups] of Object.entries(value)) {
    if (!workspaceKey || !groups || typeof groups !== "object") {
      continue;
    }
    const groupState: Record<string, boolean> = {};
    for (const groupId of Object.keys(groups)) {
      if (groupId) {
        groupState[groupId] = false;
      }
    }
    if (Object.keys(groupState).length > 0) {
      next[workspaceKey] = groupState;
    }
  }
  return next;
}

function serializeAutoDsmComponentAgentGroupCollapsedByWorkspaceKey(
  value: Record<string, Record<string, boolean>>,
): Record<string, Record<string, true>> {
  const next: Record<string, Record<string, true>> = {};
  for (const [workspaceKey, groups] of Object.entries(value)) {
    const collapsed: Record<string, true> = {};
    for (const [groupId, expanded] of Object.entries(groups)) {
      if (groupId && expanded === false) {
        collapsed[groupId] = true;
      }
    }
    if (Object.keys(collapsed).length > 0) {
      next[workspaceKey] = collapsed;
    }
  }
  return next;
}

function sanitizePersistedThreadChangedFilesExpanded(
  value: PersistedUiState["threadChangedFilesExpandedById"],
): Record<string, Record<string, boolean>> {
  if (!value || typeof value !== "object") {
    return {};
  }

  const nextState: Record<string, Record<string, boolean>> = {};
  for (const [threadId, turns] of Object.entries(value)) {
    if (!threadId || !turns || typeof turns !== "object") {
      continue;
    }

    const nextTurns: Record<string, boolean> = {};
    for (const [turnId, expanded] of Object.entries(turns)) {
      if (turnId && typeof expanded === "boolean" && expanded === false) {
        nextTurns[turnId] = false;
      }
    }

    if (Object.keys(nextTurns).length > 0) {
      nextState[threadId] = nextTurns;
    }
  }

  return nextState;
}

export function hydratePersistedProjectState(parsed: PersistedUiState): void {
  persistedCollapsedProjectCwds.clear();
  persistedExpandedProjectCwds.clear();
  persistedProjectOrderCwds.length = 0;
  persistedProjectStateUsesLegacyShape = !Array.isArray(parsed.collapsedProjectCwds);
  for (const cwd of parsed.collapsedProjectCwds ?? []) {
    if (typeof cwd === "string" && cwd.length > 0) {
      persistedCollapsedProjectCwds.add(cwd);
    }
  }
  for (const cwd of parsed.expandedProjectCwds ?? []) {
    if (typeof cwd === "string" && cwd.length > 0) {
      persistedExpandedProjectCwds.add(cwd);
    }
  }
  for (const cwd of parsed.projectOrderCwds ?? []) {
    if (typeof cwd === "string" && cwd.length > 0 && !persistedProjectOrderCwds.includes(cwd)) {
      persistedProjectOrderCwds.push(cwd);
    }
  }
}

export function persistState(state: UiState): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    // Persist collapsed cwds explicitly so an empty/missing field unambiguously
    // means "first install" rather than "user collapsed everything"; without
    // this, the syncProjects fallback would re-expand all rows on next launch.
    const collapsedProjectCwds = Object.entries(state.projectExpandedById)
      .filter(([, expanded]) => !expanded)
      .flatMap(([logicalKey]) => currentProjectCwdsByLogicalKey.get(logicalKey) ?? []);
    const expandedProjectCwds = Object.entries(state.projectExpandedById)
      .filter(([, expanded]) => expanded)
      .flatMap(([logicalKey]) => currentProjectCwdsByLogicalKey.get(logicalKey) ?? []);
    const projectOrderCwds = state.projectOrder.flatMap((projectId) => {
      const cwd = currentProjectCwdById.get(projectId);
      return cwd ? [cwd] : [];
    });
    const threadChangedFilesExpandedById = Object.fromEntries(
      Object.entries(state.threadChangedFilesExpandedById).flatMap(([threadId, turns]) => {
        const nextTurns = Object.fromEntries(
          Object.entries(turns).filter(([, expanded]) => expanded === false),
        );
        return Object.keys(nextTurns).length > 0 ? [[threadId, nextTurns]] : [];
      }),
    );
    window.localStorage.setItem(
      PERSISTED_STATE_KEY,
      JSON.stringify({
        collapsedProjectCwds,
        expandedProjectCwds,
        projectOrderCwds,
        defaultAdvertisedEndpointKey: state.defaultAdvertisedEndpointKey,
        threadChangedFilesExpandedById,
        autoDsmWorkspaceProjectRef: state.autoDsmWorkspaceProjectRef,
        autodsmOnboarding: state.autodsmOnboarding,
        autoDsmThreadComponentPathById: state.autoDsmThreadComponentPathById,
        autoDsmComponentAgentGroupCollapsedByWorkspaceKey:
          serializeAutoDsmComponentAgentGroupCollapsedByWorkspaceKey(
            state.autoDsmComponentAgentGroupExpandedByWorkspaceKey,
          ),
        autoDsmActiveViewportByWorkspace: state.autoDsmActiveViewportByWorkspace,
        autoDsmActiveViewportByThreadKey: state.autoDsmActiveViewportByThreadKey,
        autoDsmChatLayoutByWorkspace: state.autoDsmChatLayoutByWorkspace,
      } satisfies PersistedUiState),
    );
    if (!legacyKeysCleanedUp) {
      legacyKeysCleanedUp = true;
      for (const legacyKey of LEGACY_PERSISTED_STATE_KEYS) {
        window.localStorage.removeItem(legacyKey);
      }
    }
  } catch {
    // Ignore quota/storage errors to avoid breaking chat UX.
  }
}

const debouncedPersistState = new Debouncer(persistState, { wait: 500 });

function recordsEqual<T>(left: Record<string, T>, right: Record<string, T>): boolean {
  const leftEntries = Object.entries(left);
  const rightEntries = Object.entries(right);
  if (leftEntries.length !== rightEntries.length) {
    return false;
  }
  for (const [key, value] of leftEntries) {
    if (right[key] !== value) {
      return false;
    }
  }
  return true;
}

function projectOrdersEqual(left: readonly string[], right: readonly string[]): boolean {
  return (
    left.length === right.length && left.every((projectId, index) => projectId === right[index])
  );
}

function nestedBooleanRecordsEqual(
  left: Record<string, Record<string, boolean>>,
  right: Record<string, Record<string, boolean>>,
): boolean {
  const leftEntries = Object.entries(left);
  const rightEntries = Object.entries(right);
  if (leftEntries.length !== rightEntries.length) {
    return false;
  }
  for (const [key, value] of leftEntries) {
    if (!(key in right) || !recordsEqual(value, right[key]!)) {
      return false;
    }
  }
  return true;
}

function pruneStaleAutoDsmWorkspaceProjectRef(
  state: UiState,
  projects: readonly SyncProjectInput[],
): UiState {
  const ref = state.autoDsmWorkspaceProjectRef;
  if (!ref) {
    return state;
  }
  const alive = projects.some(
    (project) => project.environmentId === ref.environmentId && project.projectId === ref.projectId,
  );
  if (alive) {
    return state;
  }
  return { ...state, autoDsmWorkspaceProjectRef: null };
}

export function applyAutoDsmWorkspaceProjectRef(
  state: UiState,
  ref: ScopedProjectRef | null,
): UiState {
  if (ref === null) {
    if (state.autoDsmWorkspaceProjectRef === null) {
      return state;
    }
    return { ...state, autoDsmWorkspaceProjectRef: null };
  }
  if (
    state.autoDsmWorkspaceProjectRef?.environmentId === ref.environmentId &&
    state.autoDsmWorkspaceProjectRef?.projectId === ref.projectId
  ) {
    return state;
  }
  return { ...state, autoDsmWorkspaceProjectRef: ref };
}

export function syncProjects(state: UiState, projects: readonly SyncProjectInput[]): UiState {
  state = pruneStaleAutoDsmWorkspaceProjectRef(state, projects);
  const previousProjectCwdById = new Map(currentProjectCwdById);
  const previousLogicalKeyByPhysicalKey = new Map(currentLogicalKeyByPhysicalKey);
  currentProjectCwdById.clear();
  currentLogicalKeyByPhysicalKey.clear();
  for (const project of projects) {
    currentProjectCwdById.set(project.key, project.cwd);
    currentLogicalKeyByPhysicalKey.set(project.key, project.logicalKey);
  }
  currentProjectCwdsByLogicalKey.clear();
  for (const project of projects) {
    const cwds = currentProjectCwdsByLogicalKey.get(project.logicalKey);
    if (cwds) {
      if (!cwds.includes(project.cwd)) {
        cwds.push(project.cwd);
      }
    } else {
      currentProjectCwdsByLogicalKey.set(project.logicalKey, [project.cwd]);
    }
  }
  // Build reverse map: for each new logical key, which previous logical keys
  // did its member projects live under? Lets us preserve expand state when a
  // project's logical key changes (e.g. late-arriving repo metadata flips the
  // group identity).
  const previousLogicalKeysByNewLogicalKey = new Map<string, Set<string>>();
  for (const project of projects) {
    const previousLogicalKey = previousLogicalKeyByPhysicalKey.get(project.key);
    if (!previousLogicalKey || previousLogicalKey === project.logicalKey) {
      continue;
    }
    const set = previousLogicalKeysByNewLogicalKey.get(project.logicalKey);
    if (set) {
      set.add(previousLogicalKey);
    } else {
      previousLogicalKeysByNewLogicalKey.set(project.logicalKey, new Set([previousLogicalKey]));
    }
  }
  const cwdMappingChanged =
    previousProjectCwdById.size !== currentProjectCwdById.size ||
    projects.some((project) => previousProjectCwdById.get(project.key) !== project.cwd);

  const nextExpandedById: Record<string, boolean> = {};
  const previousExpandedById = state.projectExpandedById;
  const persistedOrderByCwd = new Map(
    persistedProjectOrderCwds.map((cwd, index) => [cwd, index] as const),
  );
  const mappedProjects = projects.map((project, index) => {
    if (!(project.logicalKey in nextExpandedById)) {
      const groupCwds = currentProjectCwdsByLogicalKey.get(project.logicalKey) ?? [project.cwd];
      const fallbackFromPreviousLogicalKey = (() => {
        const previousKeys = previousLogicalKeysByNewLogicalKey.get(project.logicalKey);
        if (!previousKeys) {
          return undefined;
        }
        for (const previousKey of previousKeys) {
          if (previousKey in previousExpandedById) {
            return previousExpandedById[previousKey];
          }
        }
        return undefined;
      })();
      const fallbackFromPersistedShape = (() => {
        if (groupCwds.some((cwd) => persistedExpandedProjectCwds.has(cwd))) {
          return true;
        }
        if (groupCwds.some((cwd) => persistedCollapsedProjectCwds.has(cwd))) {
          return false;
        }
        if (persistedProjectStateUsesLegacyShape && persistedExpandedProjectCwds.size > 0) {
          return false;
        }
        return true;
      })();
      const expanded =
        previousExpandedById[project.logicalKey] ??
        fallbackFromPreviousLogicalKey ??
        fallbackFromPersistedShape;
      nextExpandedById[project.logicalKey] = expanded;
    }
    return {
      id: project.key,
      cwd: project.cwd,
      incomingIndex: index,
    };
  });

  const nextProjectOrder =
    state.projectOrder.length > 0
      ? (() => {
          const currentProjectIds = new Set(mappedProjects.map((project) => project.id));
          const nextProjectIdByCwd = new Map(
            mappedProjects.map((project) => [project.cwd, project.id] as const),
          );
          const usedProjectIds = new Set<string>();
          const orderedProjectIds: string[] = [];

          for (const projectId of state.projectOrder) {
            const matchedProjectId =
              (currentProjectIds.has(projectId) ? projectId : undefined) ??
              (() => {
                const previousCwd = previousProjectCwdById.get(projectId);
                return previousCwd ? nextProjectIdByCwd.get(previousCwd) : undefined;
              })();
            if (!matchedProjectId || usedProjectIds.has(matchedProjectId)) {
              continue;
            }
            usedProjectIds.add(matchedProjectId);
            orderedProjectIds.push(matchedProjectId);
          }

          for (const project of mappedProjects) {
            if (usedProjectIds.has(project.id)) {
              continue;
            }
            orderedProjectIds.push(project.id);
          }

          return orderedProjectIds;
        })()
      : mappedProjects
          .map((project) => ({
            id: project.id,
            incomingIndex: project.incomingIndex,
            orderIndex:
              persistedOrderByCwd.get(project.cwd) ??
              persistedProjectOrderCwds.length + project.incomingIndex,
          }))
          .toSorted((left, right) => {
            const byOrder = left.orderIndex - right.orderIndex;
            if (byOrder !== 0) {
              return byOrder;
            }
            return left.incomingIndex - right.incomingIndex;
          })
          .map((project) => project.id);

  if (
    recordsEqual(state.projectExpandedById, nextExpandedById) &&
    projectOrdersEqual(state.projectOrder, nextProjectOrder) &&
    !cwdMappingChanged
  ) {
    return state;
  }

  return {
    ...state,
    projectExpandedById: nextExpandedById,
    projectOrder: nextProjectOrder,
  };
}

export function syncThreads(state: UiState, threads: readonly SyncThreadInput[]): UiState {
  const retainedThreadIds = new Set(threads.map((thread) => thread.key));
  const nextThreadLastVisitedAtById = Object.fromEntries(
    Object.entries(state.threadLastVisitedAtById).filter(([threadId]) =>
      retainedThreadIds.has(threadId),
    ),
  );
  for (const thread of threads) {
    if (
      nextThreadLastVisitedAtById[thread.key] === undefined &&
      thread.seedVisitedAt !== undefined &&
      thread.seedVisitedAt.length > 0
    ) {
      nextThreadLastVisitedAtById[thread.key] = thread.seedVisitedAt;
    }
  }
  const nextThreadChangedFilesExpandedById = Object.fromEntries(
    Object.entries(state.threadChangedFilesExpandedById).filter(([threadId]) =>
      retainedThreadIds.has(threadId),
    ),
  );
  const nextAutoDsmPaths = Object.fromEntries(
    Object.entries(state.autoDsmThreadComponentPathById).filter(([threadId]) =>
      retainedThreadIds.has(threadId),
    ),
  );
  if (
    recordsEqual(state.threadLastVisitedAtById, nextThreadLastVisitedAtById) &&
    nestedBooleanRecordsEqual(
      state.threadChangedFilesExpandedById,
      nextThreadChangedFilesExpandedById,
    ) &&
    recordsEqual(state.autoDsmThreadComponentPathById, nextAutoDsmPaths)
  ) {
    return state;
  }
  return {
    ...state,
    threadLastVisitedAtById: nextThreadLastVisitedAtById,
    threadChangedFilesExpandedById: nextThreadChangedFilesExpandedById,
    autoDsmThreadComponentPathById: nextAutoDsmPaths,
  };
}

export function markThreadVisited(state: UiState, threadId: string, visitedAt?: string): UiState {
  const at = visitedAt ?? new Date().toISOString();
  const visitedAtMs = Date.parse(at);
  const previousVisitedAt = state.threadLastVisitedAtById[threadId];
  const previousVisitedAtMs = previousVisitedAt ? Date.parse(previousVisitedAt) : NaN;
  if (
    Number.isFinite(previousVisitedAtMs) &&
    Number.isFinite(visitedAtMs) &&
    previousVisitedAtMs >= visitedAtMs
  ) {
    return state;
  }
  return {
    ...state,
    threadLastVisitedAtById: {
      ...state.threadLastVisitedAtById,
      [threadId]: at,
    },
  };
}

export function markThreadUnread(
  state: UiState,
  threadId: string,
  latestTurnCompletedAt: string | null | undefined,
): UiState {
  if (!latestTurnCompletedAt) {
    return state;
  }
  const latestTurnCompletedAtMs = Date.parse(latestTurnCompletedAt);
  if (Number.isNaN(latestTurnCompletedAtMs)) {
    return state;
  }
  const unreadVisitedAt = new Date(latestTurnCompletedAtMs - 1).toISOString();
  if (state.threadLastVisitedAtById[threadId] === unreadVisitedAt) {
    return state;
  }
  return {
    ...state,
    threadLastVisitedAtById: {
      ...state.threadLastVisitedAtById,
      [threadId]: unreadVisitedAt,
    },
  };
}

export function clearThreadUi(state: UiState, threadId: string): UiState {
  const hasVisitedState = threadId in state.threadLastVisitedAtById;
  const hasChangedFilesState = threadId in state.threadChangedFilesExpandedById;
  const hasPreviewPath = threadId in state.autoDsmThreadComponentPathById;
  if (!hasVisitedState && !hasChangedFilesState && !hasPreviewPath) {
    return state;
  }
  const nextThreadLastVisitedAtById = { ...state.threadLastVisitedAtById };
  const nextThreadChangedFilesExpandedById = { ...state.threadChangedFilesExpandedById };
  const nextAutoDsmPaths = { ...state.autoDsmThreadComponentPathById };
  delete nextThreadLastVisitedAtById[threadId];
  delete nextThreadChangedFilesExpandedById[threadId];
  delete nextAutoDsmPaths[threadId];
  return {
    ...state,
    threadLastVisitedAtById: nextThreadLastVisitedAtById,
    threadChangedFilesExpandedById: nextThreadChangedFilesExpandedById,
    autoDsmThreadComponentPathById: nextAutoDsmPaths,
  };
}

export function setThreadChangedFilesExpanded(
  state: UiState,
  threadId: string,
  turnId: string,
  expanded: boolean,
): UiState {
  const currentThreadState = state.threadChangedFilesExpandedById[threadId] ?? {};
  const currentExpanded = currentThreadState[turnId] ?? true;
  if (currentExpanded === expanded) {
    return state;
  }

  if (expanded) {
    if (!(turnId in currentThreadState)) {
      return state;
    }

    const nextThreadState = { ...currentThreadState };
    delete nextThreadState[turnId];
    if (Object.keys(nextThreadState).length === 0) {
      const nextState = { ...state.threadChangedFilesExpandedById };
      delete nextState[threadId];
      return {
        ...state,
        threadChangedFilesExpandedById: nextState,
      };
    }

    return {
      ...state,
      threadChangedFilesExpandedById: {
        ...state.threadChangedFilesExpandedById,
        [threadId]: nextThreadState,
      },
    };
  }

  return {
    ...state,
    threadChangedFilesExpandedById: {
      ...state.threadChangedFilesExpandedById,
      [threadId]: {
        ...currentThreadState,
        [turnId]: false,
      },
    },
  };
}

export function setDefaultAdvertisedEndpointKey(state: UiState, key: string | null): UiState {
  const nextKey = key && key.length > 0 ? key : null;
  if (state.defaultAdvertisedEndpointKey === nextKey) {
    return state;
  }
  return {
    ...state,
    defaultAdvertisedEndpointKey: nextKey,
  };
}

export function toggleProject(state: UiState, projectId: string): UiState {
  const expanded = state.projectExpandedById[projectId] ?? true;
  return {
    ...state,
    projectExpandedById: {
      ...state.projectExpandedById,
      [projectId]: !expanded,
    },
  };
}

export function setProjectExpanded(state: UiState, projectId: string, expanded: boolean): UiState {
  if ((state.projectExpandedById[projectId] ?? true) === expanded) {
    return state;
  }
  return {
    ...state,
    projectExpandedById: {
      ...state.projectExpandedById,
      [projectId]: expanded,
    },
  };
}

export function reorderProjects(
  state: UiState,
  draggedProjectIds: readonly string[],
  targetProjectIds: readonly string[],
): UiState {
  if (draggedProjectIds.length === 0) {
    return state;
  }
  const draggedSet = new Set(draggedProjectIds);
  const targetSet = new Set(targetProjectIds);
  if (draggedProjectIds.every((id) => targetSet.has(id))) {
    return state;
  }

  const originalTargetIndex = state.projectOrder.findIndex((id) => targetSet.has(id));
  if (originalTargetIndex < 0) {
    return state;
  }

  const projectOrder = [...state.projectOrder];

  const removed: string[] = [];
  let draggedBeforeTarget = 0;
  for (let i = projectOrder.length - 1; i >= 0; i--) {
    if (draggedSet.has(projectOrder[i]!)) {
      removed.unshift(projectOrder.splice(i, 1)[0]!);
      if (i < originalTargetIndex) {
        draggedBeforeTarget++;
      }
    }
  }
  if (removed.length === 0) {
    return state;
  }

  const insertIndex = originalTargetIndex - Math.max(0, draggedBeforeTarget - 1);
  projectOrder.splice(insertIndex, 0, ...removed);
  return {
    ...state,
    projectOrder,
  };
}

interface UiStateStore extends UiState {
  syncProjects: (projects: readonly SyncProjectInput[]) => void;
  syncThreads: (threads: readonly SyncThreadInput[]) => void;
  markThreadVisited: (threadId: string, visitedAt?: string) => void;
  markThreadUnread: (threadId: string, latestTurnCompletedAt: string | null | undefined) => void;
  clearThreadUi: (threadId: string) => void;
  setThreadChangedFilesExpanded: (threadId: string, turnId: string, expanded: boolean) => void;
  setDefaultAdvertisedEndpointKey: (key: string | null) => void;
  setAutoDsmWorkspaceProjectRef: (ref: ScopedProjectRef | null) => void;
  patchAutodsmOnboarding: (patch: Partial<AutoDsmOnboardingState>) => void;
  completeAutodsmOnboarding: () => void;
  setPendingDesignBriefMarkdown: (markdown: string | null) => void;
  mergeAutoDsmThreadComponentPaths: (paths: Record<string, string>) => void;
  setAutoDsmComponentAgentGroupExpanded: (
    workspaceKey: string,
    groupId: string,
    expanded: boolean,
  ) => void;
  setAutoDsmActiveViewport: (input: {
    readonly workspaceKey?: string | null;
    readonly threadKey?: string | null;
    readonly viewport: AutoDsmViewportSpec;
  }) => void;
  setAutoDsmChatLayout: (input: {
    readonly workspaceKey: string;
    readonly layout: AutoDsmChatLayoutSpec;
  }) => void;
  toggleProject: (projectId: string) => void;
  setProjectExpanded: (projectId: string, expanded: boolean) => void;
  reorderProjects: (
    draggedProjectIds: readonly string[],
    targetProjectIds: readonly string[],
  ) => void;
}

/** Look up the active viewport for a (workspace, thread) pair with defaults. */
export function selectAutoDsmActiveViewport(
  state: UiState,
  args: { readonly workspaceKey?: string | null; readonly threadKey?: string | null },
): AutoDsmViewportSpec {
  if (args.threadKey) {
    const override = state.autoDsmActiveViewportByThreadKey[args.threadKey];
    if (override) return override;
  }
  if (args.workspaceKey) {
    const workspaceDefault = state.autoDsmActiveViewportByWorkspace[args.workspaceKey];
    if (workspaceDefault) return workspaceDefault;
  }
  return AUTODSM_DEFAULT_VIEWPORT;
}

/** Look up the chat 3-column layout for a workspace with defaults. */
export function selectAutoDsmChatLayout(
  state: UiState,
  args: { readonly workspaceKey?: string | null },
): AutoDsmChatLayoutSpec {
  if (args.workspaceKey) {
    const layout = state.autoDsmChatLayoutByWorkspace[args.workspaceKey];
    if (layout) return layout;
  }
  return AUTODSM_DEFAULT_CHAT_LAYOUT;
}

export const useUiStateStore = create<UiStateStore>((set) => ({
  ...readPersistedState(),
  syncProjects: (projects) => set((state) => syncProjects(state, projects)),
  syncThreads: (threads) => set((state) => syncThreads(state, threads)),
  markThreadVisited: (threadId, visitedAt) =>
    set((state) => markThreadVisited(state, threadId, visitedAt)),
  markThreadUnread: (threadId, latestTurnCompletedAt) =>
    set((state) => markThreadUnread(state, threadId, latestTurnCompletedAt)),
  clearThreadUi: (threadId) => set((state) => clearThreadUi(state, threadId)),
  setThreadChangedFilesExpanded: (threadId, turnId, expanded) =>
    set((state) => setThreadChangedFilesExpanded(state, threadId, turnId, expanded)),
  setDefaultAdvertisedEndpointKey: (key) =>
    set((state) => setDefaultAdvertisedEndpointKey(state, key)),
  setAutoDsmWorkspaceProjectRef: (ref) =>
    set((state) => applyAutoDsmWorkspaceProjectRef(state, ref)),
  patchAutodsmOnboarding: (patch) =>
    set((state) => ({
      ...state,
      autodsmOnboarding: mergeAutodsmOnboarding(state.autodsmOnboarding, patch),
    })),
  completeAutodsmOnboarding: () =>
    set((state) => ({
      ...state,
      autodsmOnboarding: mergeAutodsmOnboarding(state.autodsmOnboarding, {
        completed: true,
      }),
    })),
  setPendingDesignBriefMarkdown: (markdown) =>
    set((state) => ({
      ...state,
      pendingDesignBriefMarkdown: markdown && markdown.trim().length > 0 ? markdown : null,
    })),
  mergeAutoDsmThreadComponentPaths: (paths) =>
    set((state) => {
      const canonicalPaths = canonicalAutoDsmComponentPreviewPaths(paths);
      if (Object.keys(canonicalPaths).length === 0) {
        return state;
      }
      const next = { ...state.autoDsmThreadComponentPathById, ...canonicalPaths };
      if (recordsEqual(next, state.autoDsmThreadComponentPathById)) {
        return state;
      }
      return { ...state, autoDsmThreadComponentPathById: next };
    }),
  setAutoDsmComponentAgentGroupExpanded: (workspaceKey, groupId, expanded) =>
    set((state) => {
      if (!workspaceKey || !groupId) {
        return state;
      }
      const currentWorkspace =
        state.autoDsmComponentAgentGroupExpandedByWorkspaceKey[workspaceKey] ?? {};
      if (currentWorkspace[groupId] === expanded) {
        return state;
      }
      return {
        ...state,
        autoDsmComponentAgentGroupExpandedByWorkspaceKey: {
          ...state.autoDsmComponentAgentGroupExpandedByWorkspaceKey,
          [workspaceKey]: {
            ...currentWorkspace,
            [groupId]: expanded,
          },
        },
      };
    }),
  setAutoDsmActiveViewport: ({ workspaceKey, threadKey, viewport }) =>
    set((state) => {
      const sanitized = sanitizeViewportSpec(viewport);
      if (!sanitized) return state;
      let nextState = state;
      if (workspaceKey) {
        const current = state.autoDsmActiveViewportByWorkspace[workspaceKey];
        if (
          !current ||
          current.label !== sanitized.label ||
          current.width !== sanitized.width ||
          current.height !== sanitized.height ||
          current.devicePixelRatio !== sanitized.devicePixelRatio
        ) {
          nextState = {
            ...nextState,
            autoDsmActiveViewportByWorkspace: {
              ...nextState.autoDsmActiveViewportByWorkspace,
              [workspaceKey]: sanitized,
            },
          };
        }
      }
      if (threadKey) {
        const current = state.autoDsmActiveViewportByThreadKey[threadKey];
        if (
          !current ||
          current.label !== sanitized.label ||
          current.width !== sanitized.width ||
          current.height !== sanitized.height ||
          current.devicePixelRatio !== sanitized.devicePixelRatio
        ) {
          nextState = {
            ...nextState,
            autoDsmActiveViewportByThreadKey: {
              ...nextState.autoDsmActiveViewportByThreadKey,
              [threadKey]: sanitized,
            },
          };
        }
      }
      return nextState;
    }),
  setAutoDsmChatLayout: ({ workspaceKey, layout }) =>
    set((state) => {
      if (!workspaceKey) return state;
      const sanitized = sanitizeChatLayout(layout);
      if (!sanitized) return state;
      const current = state.autoDsmChatLayoutByWorkspace[workspaceKey];
      if (
        current &&
        current.navWidth === sanitized.navWidth &&
        current.agentWidth === sanitized.agentWidth &&
        current.sidebarCollapsed === sanitized.sidebarCollapsed
      ) {
        return state;
      }
      return {
        ...state,
        autoDsmChatLayoutByWorkspace: {
          ...state.autoDsmChatLayoutByWorkspace,
          [workspaceKey]: sanitized,
        },
      };
    }),
  toggleProject: (projectId) => set((state) => toggleProject(state, projectId)),
  setProjectExpanded: (projectId, expanded) =>
    set((state) => setProjectExpanded(state, projectId, expanded)),
  reorderProjects: (draggedProjectIds, targetProjectIds) =>
    set((state) => reorderProjects(state, draggedProjectIds, targetProjectIds)),
}));

useUiStateStore.subscribe((state) => debouncedPersistState.maybeExecute(state));

if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
  window.addEventListener("beforeunload", () => {
    debouncedPersistState.flush();
  });
}
