// @effect-diagnostics nodeBuiltinImport:off
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { installDesignSystemSync } from "./designSystemInstall.ts";
import { loadBrandTokens } from "./autoDsmTokenStore.ts";

const createdDirs: string[] = [];

function tmpWorkspace(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "autodsm-ds-install-"));
  createdDirs.push(dir);
  fs.writeFileSync(
    path.join(dir, "package.json"),
    JSON.stringify({ name: "test-ws", private: true }),
    "utf8",
  );
  return dir;
}

afterEach(() => {
  for (const dir of createdDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("designSystemInstall", () => {
  it("writes theme CSS and seeds extractable tokens for shadcn-ui", () => {
    const cwd = tmpWorkspace();
    const result = installDesignSystemSync({
      starterId: "shadcn-ui",
      cwd,
      skipPackageInstall: true,
    });
    expect(result.tokenCount).toBeGreaterThan(0);
    expect(fs.existsSync(path.join(cwd, "src/index.css"))).toBe(true);
    expect(fs.existsSync(path.join(cwd, "vite.config.ts"))).toBe(true);
  });

  it("writes MUI theme module for mui starter", () => {
    const cwd = tmpWorkspace();
    installDesignSystemSync({ starterId: "mui", cwd, skipPackageInstall: true });
    expect(fs.existsSync(path.join(cwd, "src/theme/muiTheme.ts"))).toBe(true);
    const tokens = loadBrandTokens(cwd);
    expect(tokens.some((t) => (t.name ?? "").includes("primary"))).toBe(true);
  });
});
