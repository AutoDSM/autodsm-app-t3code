/**
 * Pure predicate: Electron authenticated users on the chat-index launcher route should use the
 * minimal shell (no thread sidebar) regardless of whether projects already exist in the store.
 *
 * `/home` is the workspace home page (full sidebar) and is intentionally excluded.
 */
export function shouldUseMinimalElectronLauncherChrome(input: {
  readonly isElectron: boolean;
  readonly authGateStatus: string;
  readonly hostedStaticNeedsChrome: boolean;
  readonly pathname: string;
}): boolean {
  if (
    !input.isElectron ||
    input.authGateStatus !== "authenticated" ||
    input.hostedStaticNeedsChrome
  ) {
    return false;
  }
  if (input.pathname === "/") {
    return true;
  }
  if (input.pathname.startsWith("/onboarding")) {
    return true;
  }
  return false;
}
