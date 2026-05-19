// @effect-diagnostics nodeBuiltinImport:off
/**
 * Durable workspace brand-token store.
 *
 * Tokens persist to `<cwd>/.autodsm/brand-tokens.json`. On first read the file is
 * seeded from {@link extractBrandTokens} — this is the "auto-fill when a design
 * system is installed" behavior. After seeding the file is authoritative: scanned
 * tokens are never re-derived, so user add/remove edits survive restarts.
 *
 * @module autoDsmTokenStore
 */
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

import {
  AutoDsmBrandToken,
  type AutoDsmBrandProfile,
  type AutoDsmBrandTokenDraft,
  type AutoDsmBrandTokenPatch,
} from "@t3tools/contracts";
import * as Schema from "effect/Schema";

import { extractBrandTokens, fingerprintWorkspaceRoot, sha256Hex } from "./autoDsmHelpers.ts";
import { syncBrandTokensToThemeFiles } from "./brandTokenThemeSync.ts";

const BRAND_PROFILE_SCHEMA_VERSION = 2;
const TOKENS_DIR = ".autodsm";
const TOKENS_FILE = "brand-tokens.json";

const decodeBrandTokens = Schema.decodeUnknownSync(Schema.Array(AutoDsmBrandToken));

interface BrandTokensFile {
  readonly schemaVersion: number;
  readonly tokens: readonly AutoDsmBrandToken[];
}

function tokensFilePath(cwd: string): string {
  return path.join(cwd, TOKENS_DIR, TOKENS_FILE);
}

function buildProfileFromTokens(
  cwd: string,
  tokens: readonly AutoDsmBrandToken[],
): AutoDsmBrandProfile {
  const fingerprint = fingerprintWorkspaceRoot(cwd);
  return {
    meta: {
      kind: "brand-profile",
      schemaVersion: BRAND_PROFILE_SCHEMA_VERSION,
      owner: "brand-profile-indexer",
      invalidationKey: sha256Hex(
        `${fingerprint}:${tokens.map((t) => `${t.id}=${t.value}`).join("|")}`,
      ),
      consumers: ["render-runtime", "scanner", "publish-service"],
    },
    tokens: [...tokens],
    cssVariablePaths: [...new Set(tokens.flatMap((t) => t.sources))],
    status: tokens.length > 0 ? "ready" : "partial",
  };
}

/** Atomically persist the token list (temp file + rename). */
function writeTokensFile(cwd: string, tokens: readonly AutoDsmBrandToken[]): void {
  fs.mkdirSync(path.join(cwd, TOKENS_DIR), { recursive: true });
  const file = tokensFilePath(cwd);
  const payload: BrandTokensFile = { schemaVersion: BRAND_PROFILE_SCHEMA_VERSION, tokens };
  const tmp = `${file}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  fs.renameSync(tmp, file);
}

function persistTokens(cwd: string, tokens: readonly AutoDsmBrandToken[]): AutoDsmBrandProfile {
  writeTokensFile(cwd, tokens);
  syncBrandTokensToThemeFiles(cwd, tokens);
  return buildProfileFromTokens(cwd, tokens);
}

/** Read the persisted token list, or `null` when the file does not exist. */
function readTokensFile(cwd: string): readonly AutoDsmBrandToken[] | null {
  let raw: string;
  try {
    raw = fs.readFileSync(tokensFilePath(cwd), "utf8");
  } catch {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch (cause) {
    throw new Error("brand-tokens.json is not valid JSON.", { cause });
  }
  const tokensRaw =
    parsed !== null && typeof parsed === "object" && "tokens" in parsed
      ? (parsed as { readonly tokens: unknown }).tokens
      : parsed;
  return decodeBrandTokens(tokensRaw);
}

/** Load persisted tokens, seeding from CSS extraction on first access. */
export function loadBrandTokens(cwd: string): readonly AutoDsmBrandToken[] {
  const existing = readTokensFile(cwd);
  if (existing !== null) {
    return existing;
  }
  const seeded = extractBrandTokens(cwd);
  writeTokensFile(cwd, seeded);
  return seeded;
}

/** Load the workspace {@link AutoDsmBrandProfile}, seeding on first access. */
export function loadBrandProfile(cwd: string): AutoDsmBrandProfile {
  return buildProfileFromTokens(cwd, loadBrandTokens(cwd));
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

function tokenNameKey(token: AutoDsmBrandToken): string {
  return normalizeName(token.name ?? token.id);
}

/** Append a user-defined token; rejects duplicate name within the same category. */
export function addBrandToken(cwd: string, draft: AutoDsmBrandTokenDraft): AutoDsmBrandProfile {
  const tokens = loadBrandTokens(cwd);
  const draftName = normalizeName(draft.name);
  const clash = tokens.some((t) => t.category === draft.category && tokenNameKey(t) === draftName);
  if (clash) {
    throw new Error(`A ${draft.category} token named "${draft.name}" already exists.`);
  }
  const cssSource = tokens.find((t) => t.sources.length > 0)?.sources[0] ?? "/src/index.css";
  const token: AutoDsmBrandToken = {
    id: `user:${crypto.randomUUID()}`,
    category: draft.category,
    name: draft.name,
    value: draft.value,
    origin: "user",
    sources: [cssSource],
    ...(draft.color !== undefined ? { color: draft.color } : {}),
    ...(draft.typography !== undefined ? { typography: draft.typography } : {}),
  };
  return persistTokens(cwd, [...tokens, token]);
}

/** Remove a token by id. Idempotent — removing an unknown id is a no-op. */
export function removeBrandToken(cwd: string, tokenId: string): AutoDsmBrandProfile {
  const tokens = loadBrandTokens(cwd);
  const next = tokens.filter((t) => t.id !== tokenId);
  if (next.length === tokens.length) {
    return buildProfileFromTokens(cwd, next);
  }
  return persistTokens(cwd, next);
}

export function updateBrandToken(
  cwd: string,
  tokenId: string,
  patch: AutoDsmBrandTokenPatch,
): AutoDsmBrandProfile {
  const tokens = loadBrandTokens(cwd);
  const index = tokens.findIndex((t) => t.id === tokenId);
  if (index < 0) {
    throw new Error(`Token "${tokenId}" was not found.`);
  }
  const current = tokens[index]!;
  if (patch.name !== undefined) {
    const nextName = normalizeName(patch.name);
    const clash = tokens.some(
      (t, i) => i !== index && t.category === current.category && tokenNameKey(t) === nextName,
    );
    if (clash) {
      throw new Error(`A ${current.category} token named "${patch.name}" already exists.`);
    }
  }
  const updated: AutoDsmBrandToken = {
    ...current,
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.value !== undefined ? { value: patch.value } : {}),
    ...(patch.color !== undefined ? { color: patch.color } : {}),
    ...(patch.typography !== undefined ? { typography: patch.typography } : {}),
  };
  const next = [...tokens];
  next[index] = updated;
  return persistTokens(cwd, next);
}

/** Re-extract scanned tokens from theme files; preserve user-defined tokens. */
export function resyncBrandTokens(
  cwd: string,
  options: { readonly forceReseed?: boolean } = {},
): AutoDsmBrandProfile {
  const existing = options.forceReseed === true ? null : readTokensFile(cwd);
  const scanned = extractBrandTokens(cwd);
  if (existing === null) {
    return persistTokens(cwd, scanned);
  }
  const userTokens = existing.filter((t) => t.origin === "user");
  const scannedIds = new Set(scanned.map((t) => tokenNameKey(t)));
  const preservedUser = userTokens.filter((t) => !scannedIds.has(tokenNameKey(t)));
  return persistTokens(cwd, [...scanned, ...preservedUser]);
}

/** Force re-seed tokens from CSS after design-system install (clears prior file). */
export function seedBrandTokensFromWorkspace(cwd: string): AutoDsmBrandProfile {
  const seeded = extractBrandTokens(cwd);
  return persistTokens(cwd, seeded);
}
