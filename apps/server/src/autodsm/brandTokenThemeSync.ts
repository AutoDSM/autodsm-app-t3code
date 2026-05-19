// @effect-diagnostics nodeBuiltinImport:off
/**
 * Sync brand token edits back to workspace theme files (CSS custom properties and
 * generated MUI/Chakra theme modules).
 */
import * as fs from "node:fs";
import * as path from "node:path";

import type { AutoDsmBrandToken } from "@t3tools/contracts";

import { CHAKRA_THEME_TS, MUI_THEME_TS } from "./designSystemThemeContent.ts";

const CSS_CANDIDATES = [
  "src/index.css",
  "src/styles/globals.css",
  "app/globals.css",
  "src/globals.css",
] as const;

function cssVarName(token: AutoDsmBrandToken): string {
  const raw = token.name ?? token.id.replace(/^css-var:/, "").replace(/^user:/, "");
  return raw.startsWith("--") ? raw.slice(2) : raw;
}

function resolveCssPath(cwd: string, tokens: readonly AutoDsmBrandToken[]): string {
  const fromSources = tokens.flatMap((t) => t.sources).find((s) => s.endsWith(".css"));
  if (fromSources) {
    const rel = fromSources.startsWith("/") ? fromSources.slice(1) : fromSources;
    const abs = path.join(cwd, rel);
    if (fs.existsSync(abs)) {
      return abs;
    }
  }
  for (const rel of CSS_CANDIDATES) {
    const abs = path.join(cwd, rel);
    if (fs.existsSync(abs)) {
      return abs;
    }
  }
  return path.join(cwd, "src/index.css");
}

function patchCssVarInBlock(body: string, varName: string, value: string): string {
  const escaped = varName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(--${escaped}\\s*:\\s*)([^;]+)(;)`);
  if (re.test(body)) {
    return body.replace(re, `$1${value}$3`);
  }
  const trimmed = body.trimEnd();
  const sep = trimmed.length > 0 && !trimmed.endsWith("\n") ? "\n  " : "  ";
  return `${trimmed}${sep}--${varName}: ${value};\n`;
}

function patchCssScope(css: string, scopeSelector: string, varName: string, value: string): string {
  const blockRe = new RegExp(
    `(${scopeSelector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{)([^{}]*)(\\})`,
    "i",
  );
  const match = blockRe.exec(css);
  if (!match) {
    return `${css}\n${scopeSelector} {\n  --${varName}: ${value};\n}\n`;
  }
  const updatedBody = patchCssVarInBlock(match[2] ?? "", varName, value);
  return css.replace(blockRe, `$1${updatedBody}$3`);
}

function tokenLightValue(token: AutoDsmBrandToken): string {
  if (token.category === "color" && token.color?.light) {
    return token.color.light;
  }
  if (token.category === "typography" && token.typography?.fontSize) {
    return token.typography.fontSize;
  }
  return token.value;
}

function tokenDarkValue(token: AutoDsmBrandToken): string | null {
  if (token.category === "color" && token.color?.dark) {
    return token.color.dark;
  }
  return null;
}

/** Write token values into workspace CSS and regenerate library theme modules. */
export function syncBrandTokensToThemeFiles(
  cwd: string,
  tokens: readonly AutoDsmBrandToken[],
): void {
  if (tokens.length === 0) {
    return;
  }

  const cssPath = resolveCssPath(cwd, tokens);
  fs.mkdirSync(path.dirname(cssPath), { recursive: true });
  let css = "";
  try {
    css = fs.readFileSync(cssPath, "utf8");
  } catch {
    css = "";
  }

  for (const token of tokens) {
    const varName = cssVarName(token);
    const light = tokenLightValue(token);
    css = patchCssScope(css, ":root", varName, light);
    const dark = tokenDarkValue(token);
    if (dark !== null) {
      css = patchCssScope(css, ".dark", varName, dark);
    }
  }

  fs.writeFileSync(cssPath, css.endsWith("\n") ? css : `${css}\n`, "utf8");

  const themeDir = path.join(cwd, "src/theme");
  fs.mkdirSync(themeDir, { recursive: true });
  const muiPath = path.join(themeDir, "muiTheme.ts");
  const chakraPath = path.join(themeDir, "chakraTheme.ts");
  if (!fs.existsSync(muiPath)) {
    fs.writeFileSync(muiPath, MUI_THEME_TS, "utf8");
  }
  if (!fs.existsSync(chakraPath)) {
    fs.writeFileSync(chakraPath, CHAKRA_THEME_TS, "utf8");
  }
}
