// @effect-diagnostics nodeBuiltinImport:off
import * as fs from "node:fs";
import * as path from "node:path";

import type { AutoDsmBrandToken } from "@t3tools/contracts";

import { extractBrandTokens } from "./autoDsmHelpers.ts";
import { loadBrandTokens } from "./autoDsmTokenStore.ts";

const CSS_CANDIDATES = [
  "src/index.css",
  "src/styles/globals.css",
  "app/globals.css",
  "src/globals.css",
] as const;

function readCssFile(cwd: string, rel: string): string | null {
  try {
    return fs.readFileSync(path.join(cwd, rel), "utf8");
  } catch {
    return null;
  }
}

function synthesizeRootBlock(tokens: readonly AutoDsmBrandToken[]): string {
  const lines: string[] = [":root {"];
  for (const token of tokens) {
    const name = token.name ?? token.id.replace(/^css-var:/, "");
    const value =
      token.category === "color" && token.color?.light ? token.color.light : token.value;
    lines.push(`  --${name}: ${value};`);
  }
  lines.push("}");
  return lines.join("\n");
}

/** CSS text injected into component preview runtime. */
export function readWorkspacePreviewCss(cwd: string): string {
  const resolved = path.resolve(cwd);
  const profileTokens = loadBrandTokens(resolved);
  const parts: string[] = [];

  const paths = new Set<string>();
  for (const token of profileTokens) {
    for (const source of token.sources) {
      const rel = source.startsWith("/") ? source.slice(1) : source;
      paths.add(rel);
    }
  }
  if (paths.size === 0) {
    for (const rel of CSS_CANDIDATES) {
      if (readCssFile(resolved, rel) !== null) {
        paths.add(rel);
      }
    }
  }

  for (const rel of paths) {
    const text = readCssFile(resolved, rel);
    if (text && text.trim().length > 0) {
      parts.push(`/* ${rel} */\n${text}`);
    }
  }

  if (profileTokens.length > 0) {
    parts.push(`/* autodsm-token-fallback */\n${synthesizeRootBlock(profileTokens)}`);
  }

  return parts.join("\n\n");
}

/** Returns true when workspace has indexed CSS tokens on disk. */
export function workspaceHasThemeCss(cwd: string): boolean {
  return extractBrandTokens(cwd).length > 0;
}
