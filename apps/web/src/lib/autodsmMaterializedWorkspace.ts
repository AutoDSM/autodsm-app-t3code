/**
 * Detects workspace roots materialized by AutoDSM `createWorkspace` under `~/.autodsm/systems/`.
 */
export function isAutodsmMaterializedSystemCwd(cwd: string): boolean {
  const n = cwd.replace(/\\/g, "/");
  return n.includes("/.autodsm/systems/") || n.includes("/.autodsm\\systems\\");
}
