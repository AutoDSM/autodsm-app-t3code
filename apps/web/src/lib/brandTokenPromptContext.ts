import type { AutoDsmBrandProfile, AutoDsmBrandToken } from "@t3tools/contracts";

import { tokenDisplayName } from "~/lib/designTokenGroups";

/** Build a case-insensitive lookup set of mention handles (without @). */
export function brandTokenNameSet(profile: AutoDsmBrandProfile | undefined): ReadonlySet<string> {
  if (!profile) {
    return new Set();
  }
  const names = new Set<string>();
  for (const token of profile.tokens) {
    names.add(tokenDisplayName(token).toLowerCase());
  }
  return names;
}

const BRAND_TOKEN_MENTION_RE = /(^|\s)@([a-zA-Z][a-zA-Z0-9-_]*)(?=\s|$|[.,!?;:])/g;

/** Collect @token references from plain prompt text. */
export function collectReferencedBrandTokenNames(
  prompt: string,
  profile: AutoDsmBrandProfile | undefined,
): readonly string[] {
  if (!profile || profile.tokens.length === 0 || prompt.trim().length === 0) {
    return [];
  }
  const known = brandTokenNameSet(profile);
  const hits: string[] = [];
  const seen = new Set<string>();
  for (const match of prompt.matchAll(BRAND_TOKEN_MENTION_RE)) {
    const raw = match[2] ?? "";
    if (raw.includes("/") || raw.includes(".")) {
      continue;
    }
    const key = raw.toLowerCase();
    if (!known.has(key) || seen.has(key)) {
      continue;
    }
    seen.add(key);
    hits.push(raw);
  }
  return hits;
}

export function resolveBrandTokensByName(
  profile: AutoDsmBrandProfile,
  names: readonly string[],
): readonly AutoDsmBrandToken[] {
  const byName = new Map(
    profile.tokens.map((token) => [tokenDisplayName(token).toLowerCase(), token] as const),
  );
  return names
    .map((name) => byName.get(name.toLowerCase()))
    .filter((token): token is AutoDsmBrandToken => token !== undefined);
}

function formatTokenLine(token: AutoDsmBrandToken): string {
  const name = tokenDisplayName(token);
  if (token.category === "color" && token.color) {
    const parts = [
      token.color.light !== undefined ? `light=${token.color.light}` : null,
      token.color.dark !== undefined ? `dark=${token.color.dark}` : null,
    ].filter((part): part is string => part !== null);
    return `- @${name} (${token.category}): ${parts.join(", ") || token.value}`;
  }
  if (token.category === "typography" && token.typography) {
    return `- @${name} (${token.category}): ${JSON.stringify(token.typography)}`;
  }
  return `- @${name} (${token.category}): ${token.value}`;
}

/** Compact appendix block appended to agent prompts. */
export function formatBrandTokenPromptAppendix(input: {
  readonly profile: AutoDsmBrandProfile | undefined;
  readonly prompt: string;
}): string | null {
  const { profile, prompt } = input;
  if (!profile || profile.tokens.length === 0) {
    return null;
  }
  const referencedNames = collectReferencedBrandTokenNames(prompt, profile);
  const referenced = resolveBrandTokensByName(profile, referencedNames);
  const lines: string[] = [];

  if (referenced.length > 0) {
    lines.push("Referenced tokens:");
    for (const token of referenced) {
      lines.push(formatTokenLine(token));
    }
  }

  const shouldIncludeProfilePreview = referenced.length === 0 || referenced.length > 2;
  if (shouldIncludeProfilePreview) {
    lines.push(`Active brand profile (${profile.tokens.length} tokens):`);
    const preview = profile.tokens.slice(0, 32);
    for (const token of preview) {
      lines.push(formatTokenLine(token));
    }
    if (profile.tokens.length > preview.length) {
      lines.push(`… and ${profile.tokens.length - preview.length} more`);
    }
  }

  return lines.join("\n");
}

/** Append the design-token appendix block when profile data is available. */
export function appendBrandTokenContextToPrompt(input: {
  readonly prompt: string;
  readonly profile: AutoDsmBrandProfile | undefined;
  /** When set, @token references are resolved from this text instead of `prompt`. */
  readonly tokenSourcePrompt?: string;
}): string {
  const appendix = formatBrandTokenPromptAppendix({
    profile: input.profile,
    prompt: input.tokenSourcePrompt ?? input.prompt,
  });
  if (!appendix || appendix.trim().length === 0) {
    return input.prompt;
  }
  return `${input.prompt}\n\n--- Design tokens ---\n${appendix}`;
}
