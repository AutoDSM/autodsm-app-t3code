// @effect-diagnostics nodeBuiltinImport:off
// @effect-diagnostics globalDate:off
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
  type AutoDsmIndexStatus,
} from "@t3tools/contracts";
import * as Schema from "effect/Schema";

import {
  autodsmDir,
  brandProfileMetaPath,
  brandTokensPath,
  legacyBrandTokensPath,
} from "./autodsmPersistencePaths.ts";
import {
  extractBrandTokens,
  fingerprintWorkspaceRoot,
  sha256Hex,
  canonicalizeBrandTokenCategory,
} from "./autoDsmHelpers.ts";
import { syncBrandTokensToThemeFiles } from "./brandTokenThemeSync.ts";

const BRAND_PROFILE_SCHEMA_VERSION = 2;
const BRAND_PROFILE_META_SCHEMA_VERSION = 1;
const SUPPORTED_BRAND_TOKEN_FILE_VERSIONS = new Set([BRAND_PROFILE_SCHEMA_VERSION]);

const decodeBrandTokens = Schema.decodeUnknownSync(Schema.Array(AutoDsmBrandToken));

const BrandTokensFileSchema = Schema.Struct({
  schemaVersion: Schema.Int,
  tokens: Schema.Array(AutoDsmBrandToken),
});

const decodeBrandTokensFile = Schema.decodeUnknownSync(BrandTokensFileSchema);

interface BrandProfileMetaFile {
  readonly schemaVersion: number;
  readonly invalidationKey: string;
  readonly cssVariablePaths: readonly string[];
  readonly lastResyncAt?: string;
  readonly status: AutoDsmIndexStatus;
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

function readBrandProfileMeta(cwd: string): BrandProfileMetaFile | null {
  let raw: string;
  try {
    raw = fs.readFileSync(brandProfileMetaPath(cwd), "utf8");
  } catch {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch (cause) {
    throw new Error("brand-profile.meta.json is not valid JSON.", { cause });
  }
  if (parsed === null || typeof parsed !== "object") {
    throw new Error("brand-profile.meta.json has an invalid shape.");
  }
  const record = parsed as Record<string, unknown>;
  if (record.schemaVersion !== BRAND_PROFILE_META_SCHEMA_VERSION) {
    throw new Error(
      `Unsupported brand-profile.meta.json schemaVersion ${String(record.schemaVersion)}.`,
    );
  }
  if (typeof record.invalidationKey !== "string" || record.invalidationKey.trim().length === 0) {
    throw new Error("brand-profile.meta.json is missing invalidationKey.");
  }
  const status = record.status;
  if (status !== "ready" && status !== "partial" && status !== "failed" && status !== "stale") {
    throw new Error("brand-profile.meta.json has an invalid status.");
  }
  return {
    schemaVersion: BRAND_PROFILE_META_SCHEMA_VERSION,
    invalidationKey: record.invalidationKey,
    cssVariablePaths: Array.isArray(record.cssVariablePaths)
      ? record.cssVariablePaths.filter((value): value is string => typeof value === "string")
      : [],
    ...(typeof record.lastResyncAt === "string" ? { lastResyncAt: record.lastResyncAt } : {}),
    status,
  };
}

function writeBrandProfileMeta(cwd: string, profile: AutoDsmBrandProfile): void {
  const payload: BrandProfileMetaFile = {
    schemaVersion: BRAND_PROFILE_META_SCHEMA_VERSION,
    invalidationKey: profile.meta.invalidationKey,
    cssVariablePaths: profile.cssVariablePaths,
    lastResyncAt: new Date().toISOString(),
    status: profile.status,
  };
  fs.mkdirSync(autodsmDir(cwd), { recursive: true });
  const file = brandProfileMetaPath(cwd);
  const tmp = `${file}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  fs.renameSync(tmp, file);
}

/** Atomically persist the token list (temp file + rename). */
function writeTokensFile(cwd: string, tokens: readonly AutoDsmBrandToken[]): void {
  fs.mkdirSync(autodsmDir(cwd), { recursive: true });
  const file = brandTokensPath(cwd);
  const payload = { schemaVersion: BRAND_PROFILE_SCHEMA_VERSION, tokens };
  const tmp = `${file}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  fs.renameSync(tmp, file);
}

function decodePersistedTokens(parsed: unknown, sourceLabel: string): readonly AutoDsmBrandToken[] {
  if (parsed !== null && typeof parsed === "object" && "tokens" in parsed) {
    const file = decodeBrandTokensFile(parsed);
    if (!SUPPORTED_BRAND_TOKEN_FILE_VERSIONS.has(file.schemaVersion)) {
      throw new Error(
        `Unsupported ${sourceLabel} schemaVersion ${file.schemaVersion}. Expected ${BRAND_PROFILE_SCHEMA_VERSION}.`,
      );
    }
    return file.tokens;
  }
  return decodeBrandTokens(parsed);
}

function readTokensPayload(cwd: string): readonly AutoDsmBrandToken[] | null {
  let raw: string;
  try {
    raw = fs.readFileSync(brandTokensPath(cwd), "utf8");
  } catch {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch (cause) {
    throw new Error("brand-tokens.json is not valid JSON.", { cause });
  }
  return decodePersistedTokens(parsed, "brand-tokens.json");
}

function migrateLegacyTokensFile(cwd: string): readonly AutoDsmBrandToken[] | null {
  const legacyPath = legacyBrandTokensPath(cwd);
  let raw: string;
  try {
    raw = fs.readFileSync(legacyPath, "utf8");
  } catch {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
  const tokens = decodePersistedTokens(parsed, "tokens.json");
  writeTokensFile(cwd, tokens);
  writeBrandProfileMeta(cwd, buildProfileFromTokens(cwd, tokens));
  try {
    fs.unlinkSync(legacyPath);
  } catch {
    // Best-effort cleanup of legacy file.
  }
  return tokens;
}

/**
 * Atomically persist the token list and re-sync derived theme files. Exposed
 * so callers that compute the full next-state in memory (e.g. the design-brief
 * applier batching N operations) can write + theme-sync ONCE instead of N
 * times — the per-op `addBrandToken` / `updateBrandToken` helpers each invoke
 * `syncBrandTokensToThemeFiles` and churn the brand-profile invalidation key
 * on every call.
 */
export function persistTokens(
  cwd: string,
  tokens: readonly AutoDsmBrandToken[],
): AutoDsmBrandProfile {
  const previousMeta = readBrandProfileMeta(cwd);
  const profile = buildProfileFromTokens(cwd, tokens);
  writeTokensFile(cwd, tokens);
  writeBrandProfileMeta(cwd, profile);
  if (previousMeta?.invalidationKey !== profile.meta.invalidationKey) {
    syncBrandTokensToThemeFiles(cwd, tokens);
  }
  return profile;
}

/** Read the persisted token list, or `null` when the file does not exist. */
function readTokensFile(cwd: string): readonly AutoDsmBrandToken[] | null {
  const existing = readTokensPayload(cwd);
  if (existing !== null) {
    return existing;
  }
  return migrateLegacyTokensFile(cwd);
}

function migrateTokenCategories(
  tokens: readonly AutoDsmBrandToken[],
): readonly AutoDsmBrandToken[] {
  return tokens.map((token) => {
    const category = canonicalizeBrandTokenCategory(token);
    return category === token.category ? token : { ...token, category };
  });
}

/** Load persisted tokens, seeding from CSS extraction on first access. */
export function loadBrandTokens(cwd: string): readonly AutoDsmBrandToken[] {
  const existing = readTokensFile(cwd);
  if (existing !== null) {
    const migrated = migrateTokenCategories(existing);
    if (migrated.some((token, index) => token.category !== existing[index]?.category)) {
      writeTokensFile(cwd, migrated);
      writeBrandProfileMeta(cwd, buildProfileFromTokens(cwd, migrated));
    }
    return migrated;
  }
  const seeded = extractBrandTokens(cwd);
  return persistTokens(cwd, seeded).tokens;
}

/** Load the workspace {@link AutoDsmBrandProfile}, seeding on first access. */
export function loadBrandProfile(cwd: string): AutoDsmBrandProfile {
  const tokens = loadBrandTokens(cwd);
  return buildProfileFromTokens(cwd, tokens);
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

/** Exported for publish/export token counts. */
export { brandTokensPath };
