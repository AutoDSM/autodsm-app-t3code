import { resolveThreadRouteRef } from "~/threadRoutes";
import type {
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
    if (explicitProject?.cwd?.trim()) {
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
      if (proj?.cwd?.trim()) {
        return {
          environmentId: proj.environmentId,
          projectId: proj.id,
          cwd: proj.cwd,
          projectName: proj.name,
        };
      }
    }
  }

  const primary = orderedProjects[0] ?? null;
  if (!primary) {
    return { environmentId: null, projectId: null, cwd: null, projectName: null };
  }

  return {
    environmentId: primary.environmentId,
    projectId: primary.id,
    cwd: primary.cwd,
    projectName: primary.name,
  };
}
