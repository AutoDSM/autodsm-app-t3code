// @effect-diagnostics nodeBuiltinImport:off
import { describe, expect, it } from "vitest";

import * as path from "node:path";

import {
  AUTODSM_DIR,
  BRAND_PROFILE_META_FILE,
  BRAND_TOKENS_FILE,
  brandProfileMetaPath,
  brandTokensPath,
  componentAgentsPath,
  workspaceMetaPath,
} from "./autodsmPersistencePaths.ts";

describe("autodsmPersistencePaths", () => {
  it("resolves canonical workspace artifact paths", () => {
    const cwd = "/tmp/ws/system";
    const workspaceRoot = "/tmp/ws";
    expect(brandTokensPath(cwd)).toBe(path.join(cwd, AUTODSM_DIR, BRAND_TOKENS_FILE));
    expect(brandProfileMetaPath(cwd)).toBe(path.join(cwd, AUTODSM_DIR, BRAND_PROFILE_META_FILE));
    expect(componentAgentsPath(workspaceRoot)).toBe(
      path.join(workspaceRoot, "component-agents.json"),
    );
    expect(workspaceMetaPath(workspaceRoot)).toBe(path.join(workspaceRoot, "meta.json"));
  });
});
