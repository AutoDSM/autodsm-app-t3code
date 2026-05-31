import { resolveThreadRouteRef } from "~/threadRoutes";
import type {
  AutoDsmWorkspaceHistoryEntry,
  EnvironmentId,
  ProjectId,
  ScopedProjectRef,
  ScopedThreadRef,
  ThreadId,
} from "@t3tools/contracts";
import type { Project, SidebarThreadSummary } from "~/types";

/**
 * Prefix paths that occupy one path segment under the chat router and must not be parsed as `/env/thread`.
 */
const RESERVED_FIRST_SEGMENTS = new Set([
  "home",
  "design-components",
  "design-tokens",
  "draft",
  "preview-components-sandbox",
  "component-preview-runtime",
]);

/**
 * If the current URL pathname is a chat thread route `/${environmentId}/${threadId}`, parse it into a scoped thread ref.
 * Returns null for home, AutoDSM static routes, draft routes, and other layouts.
 */
export function parseScopedThreadRefFromChatPathname(pathname: string): ScopedThreadRef | null {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length !== 2) return null;

  const first = segments[0];
  const second = segments[1];
  if (!first || !second) return null;

  // Draft routes `/draft/:id` use separate layout.
  if (first === "draft") return null;

  if (RESERVED_FIRST_SEGMENTS.has(first)) return null;

  return resolveThreadRouteRef({
    environmentId: first as EnvironmentId,
    threadId: second as ThreadId,
  });
}

export interface AutoDsmWorkspaceSelection {
  readonly environmentId: EnvironmentId | null;
  readonly projectId: ProjectId | null;
  readonly cwd: string | null;
  readonly projectName: string | null;
}

interface ResolveAutoDsmWorkspaceInput {
  readonly pathname: string;
  readonly sidebarThreads: readonly SidebarThreadSummary[];
  readonly orderedProjects: readonly Project[];
  readonly projects: readonly Project[];
  readonly explicitWorkspaceProjectRef: ScopedProjectRef | null;
  /**
   * Optional snapshot of the on-disk AutoDSM workspace history. When the
   * orchestration store hasn't yet loaded a project for the materialised
   * workspace (cold-boot race), the resolver falls back to this so the
   * dashboard can render its `cwd`-dependent state immediately.
   */
  readonly diskHistory?: readonly AutoDsmWorkspaceHistoryEntry[];
  /**
   * Primary environment id, used together with `diskHistory` to construct
   * the fallback selection. The history doesn't carry an environment by
   * itself; the caller supplies the current primary.
   */
  readonly primaryEnvironmentId?: EnvironmentId | null;
}

/**
 * True when a project's `cwd` lives under an AutoDSM systems directory
 * (`~/.autodsm/systems/<id>/...` on macOS/Linux, or the equivalent on Windows).
 * Used to prevent unrelated t3code orchestration projects (e.g. an `apps/server`
 * folder the user once opened) from being picked as the "primary" AutoDSM
 * workspace when no thread route is active.
 */
export function isAutoDsmWorkspaceProject(project: Project): boolean {
  const cwd = project.cwd?.trim();
  if (!cwd) return false;
  // Normalize backslashes for Windows; match the canonical autodsm layout.
  const normalized = cwd.replace(/\\/g, "/");
  return /(^|\/)\.autodsm\/systems\//.test(normalized);
}

/**
 * Single resolution policy for Components / Tokens / previews:
 *
 * 1. Explicit AutoDSM workspace from launch (Open folder / clone), when it resolves to a live project.
 * 2. When the pathname is a chat thread (`/{environmentId}/{threadId}`), that thread's project.
 * 3. Otherwise the ordered primary project (sidebar [`projectOrder`]).
 */
export function resolveAutoDsmWorkspace(
  input: ResolveAutoDsmWorkspaceInput,
): AutoDsmWorkspaceSelection {
  const { pathname, sidebarThreads, orderedProjects, projects, explicitWorkspaceProjectRef } =
    input;

  if (explicitWorkspaceProjectRef) {
    const explicitProject = projects.find(
      (project) =>
        project.environmentId === explicitWorkspaceProjectRef.environmentId &&
        project.id === explicitWorkspaceProjectRef.projectId,
    );
    if (explicitProject?.cwd?.trim() && isAutoDsmWorkspaceProject(explicitProject)) {
      return {
        environmentId: explicitProject.environmentId,
        projectId: explicitProject.id,
        cwd: explicitProject.cwd,
        projectName: explicitProject.name,
      };
    }
  }

  const routeThreadRef = parseScopedThreadRefFromChatPathname(pathname);

  if (routeThreadRef) {
    const thread = sidebarThreads.find(
      (t) => t.environmentId === routeThreadRef.environmentId && t.id === routeThreadRef.threadId,
    );
    if (!thread?.projectId) {
      /* thread may hydrate after route */
    } else {
      const proj = orderedProjects.find(
        (p) => p.environmentId === thread.environmentId && p.id === thread.projectId,
      );
      if (proj?.cwd?.trim() && isAutoDsmWorkspaceProject(proj)) {
        return {
          environmentId: proj.environmentId,
          projectId: proj.id,
          cwd: proj.cwd,
          projectName: proj.name,
        };
      }
    }
  }

  // Primary fallback: pick the first AutoDSM workspace, not just the first
  // project. An unrelated t3code project (e.g. an `apps/server` folder the user
  // opened in the past) must not hijack the AutoDSM workspace slot.
  const primary = orderedProjects.find((project) => isAutoDsmWorkspaceProject(project)) ?? null;
  if (primary) {
    return {
      environmentId: primary.environmentId,
      projectId: primary.id,
      cwd: primary.cwd,
      projectName: primary.name,
    };
  }

  // Cold-boot fallback: orchestration store hasn't yet loaded a project for
  // the on-disk workspace. Use the history snapshot so the dashboard can
  // render immediately. `projectId` is null here — surfaces that need an
  // orchestration projectId (e.g. starting a new thread) wait for bootstrap
  // to populate it; surfaces that only need a `cwd` (registry, brand profile,
  // sidecar status) work right away.
  if (input.diskHistory && input.diskHistory.length > 0 && input.primaryEnvironmentId) {
    const entry = input.diskHistory[0]!;
    const cwd = entry.systemPath?.trim();
    if (cwd) {
      return {
        environmentId: input.primaryEnvironmentId,
        projectId: null,
        cwd,
        projectName: entry.displayName ?? null,
      };
    }
  }

  return { environmentId: null, projectId: null, cwd: null, projectName: null };
}
