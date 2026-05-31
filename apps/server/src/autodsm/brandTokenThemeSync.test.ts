// @effect-diagnostics nodeBuiltinImport:off
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { syncBrandTokensToThemeFiles } from "./brandTokenThemeSync.ts";

const createdDirs: string[] = [];

afterEach(() => {
  for (const dir of createdDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("brandTokenThemeSync", () => {
  it("patches CSS custom properties in :root", () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "autodsm-theme-sync-"));
    createdDirs.push(cwd);
    fs.mkdirSync(path.join(cwd, "src"), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, "src/index.css"),
      ":root { --primary: #111; }\n.dark { --primary: #222; }\n",
      "utf8",
    );

    syncBrandTokensToThemeFiles(cwd, [
      {
        id: "css-var:primary",
        category: "color",
        name: "primary",
        value: "#abc",
        origin: "scanned",
        sources: ["/src/index.css"],
        color: { light: "#abc", dark: "#def" },
      },
    ]);

    const css = fs.readFileSync(path.join(cwd, "src/index.css"), "utf8");
    expect(css).toContain("--primary: #abc");
    expect(css).toContain(".dark");
    expect(css).toContain("--primary: #def");
  });

  it("patches iconLibrary in components.json for icon-library token", () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "autodsm-theme-sync-icon-"));
    createdDirs.push(cwd);
    fs.mkdirSync(path.join(cwd, "src"), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, "components.json"),
      `${JSON.stringify({ iconLibrary: "lucide" }, null, 2)}\n`,
      "utf8",
    );

    syncBrandTokensToThemeFiles(cwd, [
      {
        id: "config:icon-library",
        category: "icon",
        name: "icon-library",
        value: "heroicons",
        origin: "scanned",
        sources: ["/components.json"],
      },
    ]);

    const parsed = JSON.parse(fs.readFileSync(path.join(cwd, "components.json"), "utf8")) as {
      iconLibrary?: string;
    };
    expect(parsed.iconLibrary).toBe("heroicons");
  });
});
