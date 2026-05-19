import { isAutodsmMaterializedSystemCwd } from "~/lib/autodsmMaterializedWorkspace";

export interface ShouldUseAutodsmComponentAgentSidebarInput {
  readonly workspaceCwd: string | null;
}

/**
 * AutoDSM materialized workspaces use flat component-agent tabs instead of the T3 Code Projects list.
 */
export function shouldUseAutodsmComponentAgentSidebar(
  input: ShouldUseAutodsmComponentAgentSidebarInput,
): boolean {
  const cwd = input.workspaceCwd?.trim();
  if (!cwd) {
    return false;
  }
  return isAutodsmMaterializedSystemCwd(cwd);
}
