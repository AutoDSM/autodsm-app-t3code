// @effect-diagnostics nodeBuiltinImport:off
import * as path from "node:path";

/** Directory under workspace `system/` cwd for AutoDSM-owned artifacts. */
export const AUTODSM_DIR = ".autodsm";

export const BRAND_TOKENS_FILE = "brand-tokens.json";
export const BRAND_PROFILE_META_FILE = "brand-profile.meta.json";
export const LEGACY_TOKENS_FILE = "tokens.json";

export const COMPONENT_AGENTS_FILE = "component-agents.json";
export const COMPONENT_REGISTRY_FILE = "component-registry.json";
export const WORKSPACE_META_FILE = "meta.json";

export const RENDER_MANIFESTS_DIR = "render-manifests";

/** Absolute path to `system/.autodsm/brand-tokens.json`. */
export function brandTokensPath(cwd: string): string {
  return path.join(cwd, AUTODSM_DIR, BRAND_TOKENS_FILE);
}

/** Absolute path to `system/.autodsm/brand-profile.meta.json`. */
export function brandProfileMetaPath(cwd: string): string {
  return path.join(cwd, AUTODSM_DIR, BRAND_PROFILE_META_FILE);
}

/** Legacy path at `system/tokens.json` (migration shim only). */
export function legacyBrandTokensPath(systemDir: string): string {
  return path.join(systemDir, LEGACY_TOKENS_FILE);
}

/** Absolute path to workspace-root `component-agents.json`. */
export function componentAgentsPath(workspaceRoot: string): string {
  return path.join(workspaceRoot, COMPONENT_AGENTS_FILE);
}

/** Absolute path to workspace-root `component-registry.json`. */
export function componentRegistryPath(workspaceRoot: string): string {
  return path.join(workspaceRoot, COMPONENT_REGISTRY_FILE);
}

/** Absolute path to workspace-root `meta.json`. */
export function workspaceMetaPath(workspaceRoot: string): string {
  return path.join(workspaceRoot, WORKSPACE_META_FILE);
}

/** Absolute path to `system/.autodsm/render-manifests/`. */
export function renderManifestsDir(cwd: string): string {
  return path.join(cwd, AUTODSM_DIR, RENDER_MANIFESTS_DIR);
}

/** Absolute path to a render manifest JSON file. */
export function renderManifestPath(cwd: string, manifestId: string): string {
  return path.join(renderManifestsDir(cwd), `${manifestId}.json`);
}

/** Absolute path to `system/.autodsm/` directory. */
export function autodsmDir(cwd: string): string {
  return path.join(cwd, AUTODSM_DIR);
}
