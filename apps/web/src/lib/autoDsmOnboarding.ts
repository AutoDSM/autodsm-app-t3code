import { allowFakeOnboardingAuth } from "./devSupabaseBypass";
import { isSupabaseAuthConfigured } from "./supabase/config";
import type { AutoDsmBetaStatus } from "./supabase/profile";

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
  /**
   * Whether the user uploaded (or skipped) a `design.md` brief during onboarding.
   * Set to `true` on Skip OR on successful brief upload+apply. Soft signal —
   * never gates forward navigation; brief is optional.
   */
  briefUploaded: boolean;
}

export const defaultAutodsmOnboardingState: AutoDsmOnboardingState = {
  completed: false,
  fakeAuthProvider: null,
  designSystemName: null,
  buildMethod: null,
  starterId: null,
  briefUploaded: false,
};

export type AutoDsmOnboardingRouteSegment =
  | "welcome"
  | "beta"
  | "create"
  | "name"
  | "method"
  | "library"
  | "brief"
  | "loading";

export interface OnboardingAuthContext {
  readonly supabaseConfigured: boolean;
  readonly supabaseSessionActive: boolean;
  readonly supabaseBetaStatus: AutoDsmBetaStatus | null;
}

/** Maps missing beta rows to approved (matches profile.ts fallback for OAuth users). */
export function resolveOnboardingBetaStatus(
  betaStatus: AutoDsmBetaStatus | null,
): AutoDsmBetaStatus | null {
  if (betaStatus === "pending" || betaStatus === "rejected") {
    return betaStatus;
  }
  return "approved";
}

/** Whether onboarding auth step is satisfied (Supabase session or dev fake auth). */
export function isOnboardingAuthSatisfied(
  state: AutoDsmOnboardingState,
  auth: OnboardingAuthContext = {
    supabaseConfigured: isSupabaseAuthConfigured(),
    supabaseSessionActive: false,
    supabaseBetaStatus: null,
  },
): boolean {
  if (auth.supabaseConfigured) {
    return (
      auth.supabaseSessionActive &&
      resolveOnboardingBetaStatus(auth.supabaseBetaStatus) === "approved"
    );
  }
  if (allowFakeOnboardingAuth()) {
    return state.fakeAuthProvider !== null;
  }
  return false;
}

function isOnboardingBetaGateSatisfied(
  auth: OnboardingAuthContext = {
    supabaseConfigured: isSupabaseAuthConfigured(),
    supabaseSessionActive: false,
    supabaseBetaStatus: null,
  },
): boolean {
  return (
    auth.supabaseConfigured && auth.supabaseSessionActive && auth.supabaseBetaStatus === "pending"
  );
}

export async function readOnboardingAuthContext(): Promise<OnboardingAuthContext> {
  const supabaseConfigured = isSupabaseAuthConfigured();
  if (!supabaseConfigured) {
    return {
      supabaseConfigured: false,
      supabaseSessionActive: false,
      supabaseBetaStatus: null,
    };
  }

  const { getSupabaseBrowserClient } = await import("./supabase/browserClient");
  const { fetchCurrentSupabaseProfile } = await import("./supabase/auth");
  const client = getSupabaseBrowserClient();
  if (client === null) {
    return {
      supabaseConfigured: true,
      supabaseSessionActive: false,
      supabaseBetaStatus: null,
    };
  }

  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError || !sessionData.session) {
    return {
      supabaseConfigured: true,
      supabaseSessionActive: false,
      supabaseBetaStatus: null,
    };
  }

  try {
    const profile = await fetchCurrentSupabaseProfile();
    return {
      supabaseConfigured: true,
      supabaseSessionActive: true,
      supabaseBetaStatus: resolveOnboardingBetaStatus(profile?.betaStatus ?? null),
    };
  } catch {
    return {
      supabaseConfigured: true,
      supabaseSessionActive: true,
      supabaseBetaStatus: "approved",
    };
  }
}

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
    case "beta":
    case "create":
    case "name":
    case "method":
    case "library":
    case "brief":
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
  const briefUploaded = o.briefUploaded === true;
  return {
    completed,
    fakeAuthProvider,
    designSystemName,
    buildMethod,
    starterId,
    briefUploaded,
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
  input?: {
    readonly allowCompletedReentry?: boolean;
    readonly auth?: OnboardingAuthContext;
  },
): `/onboarding/${AutoDsmOnboardingRouteSegment}` | null {
  const authContext = input?.auth;
  if (state.completed && !input?.allowCompletedReentry) {
    return "/onboarding/welcome";
  }
  switch (segment) {
    case "welcome":
      return null;
    case "beta":
      return isOnboardingBetaGateSatisfied(authContext) ? null : "/onboarding/welcome";
    case "create":
      return isOnboardingAuthSatisfied(state, authContext) ? null : "/onboarding/welcome";
    case "name":
      return isOnboardingAuthSatisfied(state, authContext) ? null : "/onboarding/welcome";
    case "method":
      if (!isOnboardingAuthSatisfied(state, authContext)) {
        return "/onboarding/welcome";
      }
      return hasDesignSystemName(state) ? null : "/onboarding/name";
    case "library":
      if (!isOnboardingAuthSatisfied(state, authContext)) {
        return "/onboarding/welcome";
      }
      if (!hasDesignSystemName(state)) {
        return "/onboarding/name";
      }
      return state.buildMethod === "library" ? null : "/onboarding/method";
    case "brief":
      // `brief` is the shared landing page for BOTH the scratch and library
      // flows. Precondition is just that a starterId has been chosen, which
      // is true for scratch (auto-set to `modern-starter`) and for library
      // (set to the picked library id). The brief itself is optional — this
      // case never blocks forward navigation.
      if (!isOnboardingAuthSatisfied(state, authContext)) {
        return "/onboarding/welcome";
      }
      if (!hasDesignSystemName(state)) {
        return "/onboarding/name";
      }
      return state.starterId ? null : "/onboarding/method";
    case "loading":
      if (!isOnboardingAuthSatisfied(state, authContext)) {
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

export function isAutoDsmProjectCreationOnboardingSegment(
  segment: AutoDsmOnboardingRouteSegment | "index",
): segment is AutoDsmOnboardingRouteSegment {
  return (
    segment === "create" ||
    segment === "name" ||
    segment === "method" ||
    segment === "library" ||
    segment === "brief" ||
    segment === "loading"
  );
}

export function canReenterProjectCreationOnboarding(input: {
  readonly onboardingCompleted: boolean;
  readonly hasDesignSystemOnDisk: boolean;
  readonly segment: AutoDsmOnboardingRouteSegment | "index";
}): boolean {
  return (
    input.onboardingCompleted &&
    !input.hasDesignSystemOnDisk &&
    isAutoDsmProjectCreationOnboardingSegment(input.segment)
  );
}

export function resolveChatIndexOnboarding(
  onboarding: AutoDsmOnboardingState,
  isElectron: boolean,
  isAuthenticated: boolean,
  input: {
    readonly hasActiveWorkspaceProject: boolean;
    readonly hasDesignSystemOnDisk: boolean;
  } = { hasActiveWorkspaceProject: true, hasDesignSystemOnDisk: false },
): ChatIndexOnboardingResolution | null {
  if (!isElectron || !isAuthenticated) {
    return null;
  }
  // Presence-driven: an owner-matched workspace on disk always wins, even when
  // localStorage says `completed === false` (cleared storage, fresh browser,
  // upgraded build). This is the disk-truth signal — `hasActiveWorkspaceProject`
  // alone (a localStorage flag) is not enough to override the wizard.
  if (input.hasDesignSystemOnDisk) {
    return { kind: "home", to: "/home" };
  }
  if (onboarding.completed) {
    if (input.hasActiveWorkspaceProject) {
      return { kind: "home", to: "/home" };
    }
    return null;
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
    briefUploaded: patch.briefUploaded ?? current.briefUploaded,
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
