import type { AutoDsmStarterId } from "./autoDsmStarterCatalog";
import {
  getStarterCatalogEntry,
  isAutoDsmStarterId,
  type AutoDsmStarterCatalogEntry,
} from "./autoDsmStarterCatalog";

export type AutoDsmFakeAuthProvider = "github" | "google";
export type AutoDsmOnboardingBuildMethod = "scratch" | "library";

export interface AutoDsmOnboardingState {
  completed: boolean;
  fakeAuthProvider: AutoDsmFakeAuthProvider | null;
  /** User-chosen design system name before build method / library selection. */
  designSystemName: string | null;
  buildMethod: AutoDsmOnboardingBuildMethod | null;
  starterId: AutoDsmStarterId | null;
}

export const defaultAutodsmOnboardingState: AutoDsmOnboardingState = {
  completed: false,
  fakeAuthProvider: null,
  designSystemName: null,
  buildMethod: null,
  starterId: null,
};

export type AutoDsmOnboardingRouteSegment =
  | "welcome"
  | "create"
  | "name"
  | "method"
  | "library"
  | "loading";

const DESIGN_SYSTEM_NAME_MAX_LENGTH = 120;

/** Trim and validate a design-system display name for onboarding. */
export function normalizeDesignSystemName(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.length === 0 || trimmed.length > DESIGN_SYSTEM_NAME_MAX_LENGTH) {
    return null;
  }
  return trimmed;
}

export function hasDesignSystemName(state: AutoDsmOnboardingState): boolean {
  return normalizeDesignSystemName(state.designSystemName ?? "") !== null;
}

export function parseOnboardingPath(pathname: string): AutoDsmOnboardingRouteSegment | "index" {
  const trimmed = pathname.replace(/\/+$/, "");
  if (trimmed === "/onboarding") {
    return "index";
  }
  const prefix = "/onboarding/";
  if (!trimmed.startsWith(prefix)) {
    return "index";
  }
  const tail = trimmed.slice(prefix.length);
  switch (tail) {
    case "welcome":
    case "create":
    case "name":
    case "method":
    case "library":
    case "loading":
      return tail;
    default:
      return "index";
  }
}

/** Where Electron should send users on `/` when authenticated */
export type ChatIndexOnboardingResolution =
  | { readonly kind: "onboarding"; readonly to: "/onboarding/welcome" }
  | { readonly kind: "home"; readonly to: "/home" };

export function sanitizeAutodsmOnboarding(raw: unknown): AutoDsmOnboardingState | undefined {
  if (raw === null || typeof raw !== "object") {
    return undefined;
  }
  const o = raw as Record<string, unknown>;
  const completed = o.completed === true;
  const fakeAuthProvider =
    o.fakeAuthProvider === "github" || o.fakeAuthProvider === "google" ? o.fakeAuthProvider : null;
  const buildMethod =
    o.buildMethod === "scratch" || o.buildMethod === "library" ? o.buildMethod : null;
  const starterId = isAutoDsmStarterId(o.starterId) ? o.starterId : null;
  const designSystemName =
    typeof o.designSystemName === "string" ? normalizeDesignSystemName(o.designSystemName) : null;
  return {
    completed,
    fakeAuthProvider,
    designSystemName,
    buildMethod,
    starterId,
  };
}

export function starterIdFromBuildMethod(
  method: AutoDsmOnboardingBuildMethod,
  libraryChoice: AutoDsmStarterId | null,
): AutoDsmStarterId | null {
  if (method === "scratch") {
    return "modern-starter";
  }
  if (method === "library") {
    if (!libraryChoice || libraryChoice === "modern-starter") {
      return null;
    }
    const entry = getStarterCatalogEntry(libraryChoice);
    return entry.path === "library" ? libraryChoice : null;
  }
  return null;
}

/** Subtitle under the logo on the loading screen, e.g. "Loading Shadcn UI" */
export function loadingLabelForStarter(starterId: AutoDsmStarterId | null): string {
  if (!starterId) {
    return "Loading…";
  }
  const entry = getStarterCatalogEntry(starterId);
  if (starterId === "modern-starter") {
    return "Loading your workspace";
  }
  return `Loading ${entry.label}`;
}

/**
 * If the current onboarding sub-route is invalid for persisted state, return the path to redirect to.
 */
export function getOnboardingGuardRedirect(
  segment: AutoDsmOnboardingRouteSegment,
  state: AutoDsmOnboardingState,
): `/onboarding/${AutoDsmOnboardingRouteSegment}` | null {
  if (state.completed) {
    return "/onboarding/welcome";
  }
  switch (segment) {
    case "welcome":
      return null;
    case "create":
      return state.fakeAuthProvider ? null : "/onboarding/welcome";
    case "name":
      return state.fakeAuthProvider ? null : "/onboarding/welcome";
    case "method":
      if (!state.fakeAuthProvider) {
        return "/onboarding/welcome";
      }
      return hasDesignSystemName(state) ? null : "/onboarding/name";
    case "library":
      if (!state.fakeAuthProvider) {
        return "/onboarding/welcome";
      }
      if (!hasDesignSystemName(state)) {
        return "/onboarding/name";
      }
      return state.buildMethod === "library" ? null : "/onboarding/method";
    case "loading":
      if (!state.fakeAuthProvider) {
        return "/onboarding/welcome";
      }
      if (!hasDesignSystemName(state)) {
        return "/onboarding/name";
      }
      return state.starterId ? null : "/onboarding/method";
    default: {
      const _exhaustive: never = segment;
      return _exhaustive;
    }
  }
}

export function resolveChatIndexOnboarding(
  onboarding: AutoDsmOnboardingState,
  isElectron: boolean,
  isAuthenticated: boolean,
): ChatIndexOnboardingResolution | null {
  if (!isElectron || !isAuthenticated) {
    return null;
  }
  if (onboarding.completed) {
    return { kind: "home", to: "/home" };
  }
  return { kind: "onboarding", to: "/onboarding/welcome" };
}

export function mergeAutodsmOnboarding(
  current: AutoDsmOnboardingState,
  patch: Partial<AutoDsmOnboardingState>,
): AutoDsmOnboardingState {
  return {
    completed: patch.completed ?? current.completed,
    fakeAuthProvider: patch.fakeAuthProvider ?? current.fakeAuthProvider,
    designSystemName:
      patch.designSystemName !== undefined ? patch.designSystemName : current.designSystemName,
    buildMethod: patch.buildMethod ?? current.buildMethod,
    starterId: patch.starterId !== undefined ? patch.starterId : current.starterId,
  };
}

export function selectedLibraryStarter(
  starters: readonly AutoDsmStarterCatalogEntry[],
  selectedId: AutoDsmStarterId | null,
): AutoDsmStarterCatalogEntry | null {
  if (!selectedId || selectedId === "modern-starter") {
    return starters[0] ?? null;
  }
  return starters.find((s) => s.id === selectedId) ?? starters[0] ?? null;
}
