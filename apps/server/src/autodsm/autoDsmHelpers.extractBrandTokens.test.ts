// @effect-diagnostics nodeBuiltinImport:off
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { extractBrandTokens } from "./autoDsmHelpers.ts";

const createdDirs: string[] = [];

afterEach(() => {
  for (const dir of createdDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function tmpWorkspace(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "autodsm-extract-"));
  createdDirs.push(dir);
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(dir, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content);
  }
  return dir;
}

describe("extractBrandTokens", () => {
  it("extracts icon-library from components.json", () => {
    const cwd = tmpWorkspace({
      "src/index.css": ":root { --radius: 0.5rem; }\n",
      "components.json": JSON.stringify({ iconLibrary: "lucide" }, null, 2),
    });

    const tokens = extractBrandTokens(cwd);
    const iconLibrary = tokens.find((token) => token.name === "icon-library");
    expect(iconLibrary).toMatchObject({
      category: "icon",
      value: "lucide",
      origin: "scanned",
      sources: ["/components.json"],
    });
    expect(tokens.find((token) => token.name === "radius")?.category).toBe("radius");
  });
});
