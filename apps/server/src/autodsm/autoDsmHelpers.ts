// @effect-diagnostics nodeBuiltinImport:off
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

import type {
  AutoDsmBrandToken,
  AutoDsmBrandTokenCategory,
  AutoDsmProjectProfile,
  AutoDsmRenderEnvironmentProfile,
} from "@t3tools/contracts";

import { PROVIDER_PACK_CATALOG } from "./providerPackCatalog.ts";

export function sha256Hex(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex");
}

export function fingerprintWorkspaceRoot(cwd: string): string {
  return sha256Hex(path.resolve(cwd));
}

interface PackageJsonLike {
  readonly scripts?: Record<string, string>;
  readonly dependencies?: Record<string, string>;
  readonly devDependencies?: Record<string, string>;
}

export function readPackageJson(cwd: string): PackageJsonLike | null {
  try {
    const raw = fs.readFileSync(path.join(cwd, "package.json"), "utf8");
    return JSON.parse(raw) as PackageJsonLike;
  } catch {
    return null;
  }
}

export function detectPackageManager(cwd: string): AutoDsmProjectProfile["packageManager"] {
  if (fs.existsSync(path.join(cwd, "bun.lockb")) || fs.existsSync(path.join(cwd, "bun.lock"))) {
    return "bun";
  }
  if (fs.existsSync(path.join(cwd, "pnpm-lock.yaml"))) {
    return "pnpm";
  }
  if (fs.existsSync(path.join(cwd, "yarn.lock"))) {
    return "yarn";
  }
  if (fs.existsSync(path.join(cwd, "package-lock.json"))) {
    return "npm";
  }
  return "unknown";
}

export function detectFrameworks(pkg: PackageJsonLike | null): readonly string[] {
  if (!pkg) {
    return [];
  }
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const frameworks: string[] = [];
  const maybe = (key: string, label: string) => {
    if (deps[key]) {
      frameworks.push(label);
    }
  };
  maybe("react", "react");
  maybe("next", "next");
  maybe("vite", "vite");
  maybe("@remix-run/react", "remix");
  maybe("@astrojs/react", "astro");
  maybe("tailwindcss", "tailwindcss");
  maybe("@mui/material", "mui");
  maybe("@chakra-ui/react", "chakra");
  maybe("@mantine/core", "mantine");
  maybe("antd", "antd");
  maybe("@radix-ui/react-slot", "radix");
  maybe("@tanstack/react-router", "tanstack-router");
  maybe("react-router-dom", "react-router");
  maybe("@tanstack/react-query", "react-query");
  maybe("swr", "swr");
  maybe("zustand", "zustand");
  maybe("jotai", "jotai");
  maybe("recoil", "recoil");
  maybe("react-redux", "redux");
  return frameworks.toSorted();
}

export function collectTailwindConfigPaths(cwd: string): readonly string[] {
  try {
    const entries = fs.readdirSync(cwd, { withFileTypes: true });
    return entries
      .filter((e) => e.isFile() && /^tailwind\.config\.(js|cjs|mjs|ts)$/.test(e.name))
      .map((e) => `/${e.name}`);
  } catch {
    return [];
  }
}

export function collectTsconfigHints(cwd: string): readonly string[] {
  try {
    const entries = fs.readdirSync(cwd, { withFileTypes: true });
    return entries
      .filter((e) => e.isFile() && e.name.startsWith("tsconfig") && e.name.endsWith(".json"))
      .map((e) => e.name)
      .toSorted();
  } catch {
    return [];
  }
}

const CSS_TOKEN_CANDIDATES = [
  "src/index.css",
  "src/styles/globals.css",
  "app/globals.css",
  "src/globals.css",
];

const COLOR_VALUE_RE =
  /#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla|oklch|oklab|lab|lch|color)\([^)]*\)/;
const LENGTH_VALUE_RE = /^-?\d*\.?\d+(?:px|rem|em|vh|vw|vmin|vmax|ch|%)$/;
const DURATION_VALUE_RE = /^-?\d*\.?\d+m?s$/;
const SHADOW_VALUE_RE = /\d+(?:\.\d+)?px/;
const SPECIAL_RECLASSIFY_NAME_RE =
  /(?:^|-)(?:radius|rounded|shadow|elevation|box-shadow|icon|glyph)\b/;

export const ICON_LIBRARY_TOKEN_NAME = "icon-library";

function tokenCssVarName(token: Pick<AutoDsmBrandToken, "id" | "name">): string {
  const raw =
    token.name ??
    token.id
      .replace(/^css-var:/, "")
      .replace(/^user:/, "")
      .replace(/^config:/, "");
  return raw.startsWith("--") ? raw.slice(2) : raw;
}

/** Best-effort category classification for an extracted CSS custom property. */
export function classifyBrandTokenCategory(
  varName: string,
  value: string,
): AutoDsmBrandTokenCategory {
  const name = varName.toLowerCase();
  const trimmed = value.trim();
  if (/(?:^|-)(?:font|text|leading|tracking|family|weight|line-height|letter-spacing)/.test(name)) {
    return "typography";
  }
  if (
    DURATION_VALUE_RE.test(trimmed) ||
    /cubic-bezier\(|(?:^|-)(?:ease|motion|duration|transition|animation|delay)\b/.test(
      `${name} ${trimmed.toLowerCase()}`,
    )
  ) {
    return "motion";
  }
  if (/(?:^|-)(?:radius|rounded)\b/.test(name)) {
    return "radius";
  }
  if (
    /(?:^|-)(?:shadow|elevation|box-shadow)\b/.test(name) ||
    (SHADOW_VALUE_RE.test(trimmed) &&
      /\b(?:rgb|rgba|hsl|hsla|oklch|oklab|lab|lch|#|\/\s*\d)\b/.test(trimmed))
  ) {
    return "shadow";
  }
  if (/(?:^|-)(?:icon|glyph)\b/.test(name)) {
    return "icon";
  }
  if (
    COLOR_VALUE_RE.test(trimmed) ||
    /(?:^|-)(?:color|colour|fill|bg|background|border)\b/.test(name)
  ) {
    return "color";
  }
  if (
    LENGTH_VALUE_RE.test(trimmed) ||
    /(?:^|-)(?:space|spacing|gap|size|inset|width|height)\b/.test(name)
  ) {
    return "spacing";
  }
  return "spacing";
}

/** Re-infer a persisted token category from its name/value (migration + resync). */
export function canonicalizeBrandTokenCategory(
  token: AutoDsmBrandToken,
): AutoDsmBrandTokenCategory {
  const varName = tokenCssVarName(token);
  const inferred = classifyBrandTokenCategory(varName, token.value);
  if (token.origin === "scanned" || token.id.startsWith("config:")) {
    return inferred;
  }
  const normalizedName = (token.name ?? "").trim().toLowerCase();
  if (
    normalizedName === ICON_LIBRARY_TOKEN_NAME ||
    SPECIAL_RECLASSIFY_NAME_RE.test(normalizedName) ||
    SPECIAL_RECLASSIFY_NAME_RE.test(varName.toLowerCase())
  ) {
    return inferred;
  }
  return token.category as AutoDsmBrandTokenCategory;
}

function extractIconLibraryToken(cwd: string): AutoDsmBrandToken | null {
  const abs = path.join(cwd, "components.json");
  try {
    const raw = fs.readFileSync(abs, "utf8");
    const parsed = JSON.parse(raw) as { iconLibrary?: unknown };
    if (typeof parsed.iconLibrary !== "string") {
      return null;
    }
    const value = parsed.iconLibrary.trim();
    if (value.length === 0) {
      return null;
    }
    return {
      id: "config:icon-library",
      category: "icon",
      name: ICON_LIBRARY_TOKEN_NAME,
      value,
      origin: "scanned",
      sources: ["/components.json"],
    };
  } catch {
    return null;
  }
}

function appendIconLibraryToken(
  cwd: string,
  tokens: readonly AutoDsmBrandToken[],
): readonly AutoDsmBrandToken[] {
  const iconToken = extractIconLibraryToken(cwd);
  if (iconToken === null) {
    return tokens;
  }
  const hasIconLibrary = tokens.some(
    (token) => (token.name ?? "").trim().toLowerCase() === ICON_LIBRARY_TOKEN_NAME,
  );
  if (hasIconLibrary) {
    return tokens;
  }
  return [...tokens, iconToken];
}

/** Split CSS custom properties into light-scope and dark-scope value maps. */
function extractCssVarsByScope(css: string): {
  readonly light: Map<string, string>;
  readonly dark: Map<string, string>;
} {
  const light = new Map<string, string>();
  const dark = new Map<string, string>();
  const blockRe = /([^{}]+)\{([^{}]*)\}/g;
  let block = blockRe.exec(css);
  while (block !== null) {
    const selector = (block[1] ?? "").trim().toLowerCase();
    const body = block[2] ?? "";
    const isDark = /\.dark\b|\[data-theme=["']?dark["']?\]|prefers-color-scheme:\s*dark/.test(
      selector,
    );
    const isLight =
      selector.includes(":root") ||
      selector.includes("@theme") ||
      /(?:^|,|\s)html\b/.test(selector) ||
      /(?:^|,|\s)body\b/.test(selector);
    const target = isDark ? dark : isLight ? light : null;
    if (target !== null) {
      const varRe = /--([a-zA-Z0-9-_]+)\s*:\s*([^;]+);/g;
      let m = varRe.exec(body);
      while (m !== null) {
        const name = m[1] ?? "";
        const value = (m[2] ?? "").trim();
        if (name.length > 0 && value.length > 0) {
          target.set(name, value);
        }
        m = varRe.exec(body);
      }
    }
    block = blockRe.exec(css);
  }
  return { light, dark };
}

/**
 * Extract structured brand tokens from a workspace's primary CSS file.
 *
 * Pairs `:root`/`@theme` (light) and `.dark` (dark) custom properties, classifies
 * each into a canonical category, and is the seed source for the workspace token store.
 */
export function extractBrandTokens(cwd: string): readonly AutoDsmBrandToken[] {
  for (const rel of CSS_TOKEN_CANDIDATES) {
    const abs = path.join(cwd, rel);
    try {
      const css = fs.readFileSync(abs, "utf8").slice(0, 64_000);
      const { light, dark } = extractCssVarsByScope(css);
      if (light.size === 0 && dark.size === 0) {
        continue;
      }
      const source = `/${rel.replace(/\\/g, "/")}`;
      const names = [...new Set([...light.keys(), ...dark.keys()])].toSorted();
      const tokens: AutoDsmBrandToken[] = [];
      for (const name of names) {
        const lightValue = light.get(name);
        const darkValue = dark.get(name);
        const primary = lightValue ?? darkValue ?? "";
        if (primary.length === 0) {
          continue;
        }
        const category = classifyBrandTokenCategory(name, primary);
        const base: AutoDsmBrandToken = {
          id: `css-var:${name}`,
          category,
          name,
          value: primary,
          origin: "scanned",
          sources: [source],
        };
        if (category === "color") {
          tokens.push({
            ...base,
            color: {
              ...(lightValue !== undefined ? { light: lightValue } : {}),
              ...(darkValue !== undefined ? { dark: darkValue } : {}),
            },
          });
        } else {
          tokens.push(base);
        }
      }
      if (tokens.length > 0) {
        return appendIconLibraryToken(cwd, tokens);
      }
    } catch {
      /* skip unreadable candidate */
    }
  }
  return appendIconLibraryToken(cwd, []);
}

export function detectCssPreviewEntryCandidates(cwd: string): readonly string[] {
  const candidates = [
    "src/index.css",
    "src/styles/globals.css",
    "app/globals.css",
    "src/globals.css",
  ];
  const out: string[] = [];
  for (const rel of candidates) {
    const abs = path.join(cwd, rel);
    try {
      fs.accessSync(abs);
      out.push(`/${rel.replace(/\\/g, "/")}`);
    } catch {
      /* skip */
    }
  }
  return out;
}

export function readRepLocalOverride(cwd: string): {
  readonly packs: readonly string[];
  readonly disables: readonly string[];
  readonly notes: readonly string[];
} {
  const abs = path.join(cwd, ".autodsm", "RenderEnvironmentProfile.local.json");
  try {
    const raw = fs.readFileSync(abs, "utf8");
    const parsed = JSON.parse(raw) as { providerPacks?: unknown };
    const packsRaw = Array.isArray(parsed.providerPacks) ? parsed.providerPacks : [];
    const packs: string[] = [];
    const disables: string[] = [];
    const notes: string[] = [];
    for (const entry of packsRaw) {
      if (typeof entry !== "string") {
        continue;
      }
      const trimmed = entry.trim();
      if (trimmed.startsWith("!")) {
        disables.push(trimmed.slice(1));
      } else {
        packs.push(trimmed);
      }
    }
    return { packs, disables, notes };
  } catch {
    return { packs: [], disables: [], notes: [] };
  }
}

export function buildRenderEnvironmentProfileSlice(input: {
  readonly cwd: string;
  readonly fingerprint: string;
  readonly detectedPackIds: readonly {
    readonly id: string;
    readonly layer: AutoDsmRenderEnvironmentProfile["detectedPacks"][number]["layer"];
    readonly reason: string;
  }[];
}): AutoDsmRenderEnvironmentProfile {
  const override = readRepLocalOverride(input.cwd);

  const layerForPackId = (
    id: string,
  ): AutoDsmRenderEnvironmentProfile["detectedPacks"][number]["layer"] => {
    const hit = PROVIDER_PACK_CATALOG.find((p) => p.id === id);
    return (hit?.layer ??
      "theme") as AutoDsmRenderEnvironmentProfile["detectedPacks"][number]["layer"];
  };

  const byId = new Map<
    string,
    {
      readonly id: string;
      readonly layer: AutoDsmRenderEnvironmentProfile["detectedPacks"][number]["layer"];
      readonly reason: string;
    }
  >();

  for (const pack of input.detectedPackIds) {
    if (!byId.has(pack.id)) {
      byId.set(pack.id, pack);
    }
  }
  for (const packId of override.packs) {
    if (!byId.has(packId)) {
      byId.set(packId, {
        id: packId,
        layer: layerForPackId(packId),
        reason: "local override",
      });
    }
  }

  const disabled = new Set(override.disables);
  const detected = [...byId.values()].filter((p) => !disabled.has(p.id));
  detected.sort((a, b) => a.id.localeCompare(b.id));

  const routerHits = detected.filter((p) => p.layer === "router");
  const notes = [...override.notes];
  if (routerHits.length > 1) {
    notes.push(
      "Multiple router packs detected — resolve overrides in RenderEnvironmentProfile.local.json.",
    );
  }

  return {
    meta: {
      kind: "render-environment-profile",
      schemaVersion: 1,
      owner: "render-runtime",
      invalidationKey: sha256Hex(
        `${input.fingerprint}:${detected.map((p) => p.id).join("|")}:${override.packs.join(",")}:${override.disables.join(",")}:sidecar-0`,
      ),
      consumers: ["sidecar-runtime", "preview-controller", "scanner"],
    },
    detectedPacks: detected,
    disabledPackIds: [...disabled].toSorted(),
    overrideNotes: notes,
    envAllowlist: ["NODE_ENV"],
    sidecarVersion: "0",
  };
}
