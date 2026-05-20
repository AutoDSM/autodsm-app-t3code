/** Standalone preview runtime — loaded in iframe / Electron WebContentsView, never with app chrome. */
export const COMPONENT_PREVIEW_RUNTIME_PATH = "/component-preview-runtime";

/**
 * Routes that render without the resizable thread sidebar (preview runtime, Electron launcher, onboarding).
 */
export function shouldSkipThreadSidebar(input: {
  readonly pathname: string;
  readonly isElectron: boolean;
  readonly authGateStatus: string;
  readonly hostedStaticNeedsChrome: boolean;
}): boolean {
  if (input.pathname === COMPONENT_PREVIEW_RUNTIME_PATH) {
    return true;
  }
  return shouldUseMinimalElectronLauncherChrome(input);
}

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
