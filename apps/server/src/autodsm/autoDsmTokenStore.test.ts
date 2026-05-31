// @effect-diagnostics nodeBuiltinImport:off
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  addBrandToken,
  loadBrandProfile,
  loadBrandTokens,
  removeBrandToken,
  resyncBrandTokens,
  updateBrandToken,
} from "./autoDsmTokenStore.ts";

const createdDirs: string[] = [];

function tmpWorkspace(files: Record<string, string> = {}): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "autodsm-tokens-"));
  createdDirs.push(dir);
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(dir, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content);
  }
  return dir;
}

afterEach(() => {
  for (const dir of createdDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("autoDsmTokenStore", () => {
  it("seeds an empty token file on first read when no CSS is present", () => {
    const cwd = tmpWorkspace();
    const profile = loadBrandProfile(cwd);
    expect(profile.tokens).toEqual([]);
    expect(profile.status).toBe("partial");
    expect(fs.existsSync(path.join(cwd, ".autodsm", "brand-tokens.json"))).toBe(true);
  });

  it("seeds structured color tokens from :root and .dark CSS", () => {
    const cwd = tmpWorkspace({
      "src/index.css": `:root { --primary: #8a38f5; --space-4: 16px; --radius: 0.5rem; }
.dark { --primary: #a366ff; }`,
    });
    const tokens = loadBrandTokens(cwd);
    const primary = tokens.find((t) => t.id === "css-var:primary");
    expect(primary?.category).toBe("color");
    expect(primary?.color).toEqual({ light: "#8a38f5", dark: "#a366ff" });
    const space = tokens.find((t) => t.id === "css-var:space-4");
    expect(space?.category).toBe("spacing");
    const radius = tokens.find((t) => t.id === "css-var:radius");
    expect(radius?.category).toBe("radius");
  });

  it("migrates persisted radius tokens from spacing to radius on load", () => {
    const cwd = tmpWorkspace();
    fs.mkdirSync(path.join(cwd, ".autodsm"), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, ".autodsm", "brand-tokens.json"),
      `${JSON.stringify({
        schemaVersion: 2,
        tokens: [
          {
            id: "css-var:radius",
            category: "spacing",
            name: "radius",
            value: "0.5rem",
            origin: "scanned",
            sources: ["/src/index.css"],
          },
        ],
      })}\n`,
      "utf8",
    );
    const tokens = loadBrandTokens(cwd);
    expect(tokens.find((t) => t.name === "radius")?.category).toBe("radius");
  });

  it("adds a user token and persists it across reads", () => {
    const cwd = tmpWorkspace();
    const afterAdd = addBrandToken(cwd, { category: "color", name: "brand", value: "#fff" });
    expect(afterAdd.tokens).toHaveLength(1);
    expect(afterAdd.tokens[0]?.origin).toBe("user");
    expect(loadBrandTokens(cwd)).toHaveLength(1);
  });

  it("rejects a duplicate token name within the same category", () => {
    const cwd = tmpWorkspace();
    addBrandToken(cwd, { category: "spacing", name: "gap", value: "8px" });
    expect(() => addBrandToken(cwd, { category: "spacing", name: "Gap", value: "12px" })).toThrow(
      /already exists/,
    );
  });

  it("removes a token and is idempotent for unknown ids", () => {
    const cwd = tmpWorkspace();
    const added = addBrandToken(cwd, { category: "motion", name: "fast", value: "120ms" });
    const tokenId = added.tokens[0]?.id ?? "";
    const afterRemove = removeBrandToken(cwd, tokenId);
    expect(afterRemove.tokens).toHaveLength(0);
    expect(removeBrandToken(cwd, "user:does-not-exist").tokens).toHaveLength(0);
  });

  it("updates a token and writes CSS back to disk", () => {
    const cwd = tmpWorkspace({
      "src/index.css": ":root { --primary: #111; }\n",
    });
    const seeded = loadBrandTokens(cwd);
    const primary = seeded.find((t) => t.name === "primary");
    expect(primary).toBeDefined();
    const updated = updateBrandToken(cwd, primary!.id, {
      value: "#f00",
      color: { light: "#f00", dark: "#900" },
    });
    expect(updated.tokens.find((t) => t.id === primary!.id)?.value).toBe("#f00");
    const css = fs.readFileSync(path.join(cwd, "src/index.css"), "utf8");
    expect(css).toContain("--primary: #f00");
  });

  it("resync merges scanned tokens while preserving user tokens", () => {
    const cwd = tmpWorkspace({
      "src/index.css": ":root { --primary: #111; --accent: #222; }\n",
    });
    loadBrandTokens(cwd);
    addBrandToken(cwd, { category: "color", name: "brand", value: "#fff" });
    fs.writeFileSync(
      path.join(cwd, "src/index.css"),
      ":root { --primary: #999; --accent: #222; --new-token: 4px; }\n",
      "utf8",
    );
    const resynced = resyncBrandTokens(cwd);
    expect(resynced.tokens.some((t) => t.name === "brand")).toBe(true);
    expect(resynced.tokens.some((t) => t.name === "new-token")).toBe(true);
    expect(resynced.tokens.find((t) => t.name === "primary")?.value).toBe("#999");
  });

  it("writes brand-profile.meta.json alongside tokens", () => {
    const cwd = tmpWorkspace();
    addBrandToken(cwd, { category: "color", name: "brand", value: "#fff" });
    expect(fs.existsSync(path.join(cwd, ".autodsm", "brand-profile.meta.json"))).toBe(true);
  });

  it("migrates legacy system/tokens.json into brand-tokens.json", () => {
    const cwd = tmpWorkspace();
    fs.writeFileSync(
      path.join(cwd, "tokens.json"),
      `${JSON.stringify({
        schemaVersion: 2,
        tokens: [
          {
            id: "css-var:primary",
            category: "color",
            name: "primary",
            value: "#111",
            origin: "scanned",
            sources: ["/src/index.css"],
          },
        ],
      })}\n`,
      "utf8",
    );
    const tokens = loadBrandTokens(cwd);
    expect(tokens).toHaveLength(1);
    expect(fs.existsSync(path.join(cwd, ".autodsm", "brand-tokens.json"))).toBe(true);
    expect(fs.existsSync(path.join(cwd, "tokens.json"))).toBe(false);
  });
});
