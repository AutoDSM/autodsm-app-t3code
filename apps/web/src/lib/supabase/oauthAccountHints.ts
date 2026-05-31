import type { AutoDsmOAuthProvider } from "./auth";

const STORAGE_KEY = "autodsm.oauthAccountHints.v1";

type StoredOAuthAccountHints = Partial<Record<AutoDsmOAuthProvider, string>>;

function readStoredHints(): StoredOAuthAccountHints {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      return {};
    }
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return {};
    }
    return parsed as StoredOAuthAccountHints;
  } catch {
    return {};
  }
}

function writeStoredHints(hints: StoredOAuthAccountHints): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(hints));
}

/** Last known sign-in email for a provider (used as Google `login_hint`). */
export function readOAuthAccountHint(provider: AutoDsmOAuthProvider): string | null {
  const email = readStoredHints()[provider]?.trim();
  return email ? email : null;
}

export function rememberOAuthAccountHint(
  provider: AutoDsmOAuthProvider,
  email: string | null | undefined,
): void {
  const normalized = email?.trim();
  if (!normalized) {
    return;
  }
  writeStoredHints({
    ...readStoredHints(),
    [provider]: normalized,
  });
}

export function clearOAuthAccountHint(provider: AutoDsmOAuthProvider): void {
  const hints = readStoredHints();
  if (!(provider in hints)) {
    return;
  }
  const { [provider]: _removed, ...rest } = hints;
  writeStoredHints(rest);
}
