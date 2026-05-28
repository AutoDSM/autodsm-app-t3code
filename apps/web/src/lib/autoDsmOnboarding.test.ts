import { describe, expect, it, vi } from "vitest";

vi.mock("./supabase/config", () => ({
  isSupabaseAuthConfigured: vi.fn(() => false),
}));

vi.mock("./devSupabaseBypass", () => ({
  allowFakeOnboardingAuth: vi.fn(() => true),
}));

import {
  canReenterProjectCreationOnboarding,
  defaultAutodsmOnboardingState,
  getOnboardingGuardRedirect,
  hasDesignSystemName,
  isAutoDsmProjectCreationOnboardingSegment,
  loadingLabelForStarter,
  mergeAutodsmOnboarding,
  normalizeDesignSystemName,
  isOnboardingAuthSatisfied,
  resolveOnboardingBetaStatus,
  parseOnboardingPath,
  resolveChatIndexOnboarding,
  sanitizeAutodsmOnboarding,
  starterIdFromBuildMethod,
} from "./autoDsmOnboarding";

describe("sanitizeAutodsmOnboarding", () => {
  it("returns undefined for non-objects", () => {
    expect(sanitizeAutodsmOnboarding(undefined)).toBeUndefined();
    expect(sanitizeAutodsmOnboarding("x")).toBeUndefined();
  });

  it("parses valid persisted shape", () => {
    expect(
      sanitizeAutodsmOnboarding({
        completed: true,
        fakeAuthProvider: "google",
        designSystemName: "  Acme DS  ",
        buildMethod: "library",
        starterId: "shadcn-ui",
      }),
    ).toEqual({
      completed: true,
      fakeAuthProvider: "google",
      designSystemName: "Acme DS",
      buildMethod: "library",
      starterId: "shadcn-ui",
      briefUploaded: false,
    });
  });

  it("rejects invalid starterId and provider", () => {
    expect(
      sanitizeAutodsmOnboarding({
        completed: false,
        fakeAuthProvider: "twitter",
        buildMethod: "oops",
        starterId: "vue",
      }),
    ).toEqual({
      completed: false,
      fakeAuthProvider: null,
      designSystemName: null,
      buildMethod: null,
      starterId: null,
      briefUploaded: false,
    });
  });

  it("preserves briefUploaded when present in persisted state", () => {
    expect(
      sanitizeAutodsmOnboarding({
        completed: true,
        fakeAuthProvider: "github",
        designSystemName: "Acme",
        buildMethod: "scratch",
        starterId: "modern-starter",
        briefUploaded: true,
      }),
    ).toEqual({
      completed: true,
      fakeAuthProvider: "github",
      designSystemName: "Acme",
      buildMethod: "scratch",
      starterId: "modern-starter",
      briefUploaded: true,
    });
  });
});

describe("normalizeDesignSystemName", () => {
  it("trims and accepts non-empty names", () => {
    expect(normalizeDesignSystemName("  My System  ")).toBe("My System");
  });

  it("rejects empty and overlong names", () => {
    expect(normalizeDesignSystemName("   ")).toBeNull();
    expect(normalizeDesignSystemName("x".repeat(121))).toBeNull();
  });
});

describe("hasDesignSystemName", () => {
  it("is true when a valid name is stored", () => {
    expect(
      hasDesignSystemName({ ...defaultAutodsmOnboardingState, designSystemName: "Acme" }),
    ).toBe(true);
  });
});

describe("starterIdFromBuildMethod", () => {
  it("maps scratch to modern-starter", () => {
    expect(starterIdFromBuildMethod("scratch", null)).toBe("modern-starter");
    expect(starterIdFromBuildMethod("scratch", "shadcn-ui")).toBe("modern-starter");
  });

  it("returns library id when valid", () => {
    expect(starterIdFromBuildMethod("library", "mui")).toBe("mui");
  });

  it("returns null for library without choice", () => {
    expect(starterIdFromBuildMethod("library", null)).toBeNull();
    expect(starterIdFromBuildMethod("library", "modern-starter")).toBeNull();
  });
});

describe("loadingLabelForStarter", () => {
  it("uses friendly copy for scratch", () => {
    expect(loadingLabelForStarter("modern-starter")).toBe("Loading your workspace");
  });

  it("prefixes library labels", () => {
    expect(loadingLabelForStarter("shadcn-ui")).toBe("Loading Shadcn UI");
  });
});

describe("getOnboardingGuardRedirect", () => {
  const fresh = defaultAutodsmOnboardingState;

  it("allows welcome always when not completed", () => {
    expect(getOnboardingGuardRedirect("welcome", fresh)).toBeNull();
  });

  it("redirects completed users to welcome (caller may send elsewhere)", () => {
    expect(
      getOnboardingGuardRedirect("method", {
        ...fresh,
        completed: true,
        fakeAuthProvider: "github",
      }),
    ).toBe("/onboarding/welcome");
  });

  it("guards create, name, and method", () => {
    expect(getOnboardingGuardRedirect("create", fresh)).toBe("/onboarding/welcome");
    expect(getOnboardingGuardRedirect("name", fresh)).toBe("/onboarding/welcome");
    const authed = { ...fresh, fakeAuthProvider: "github" as const };
    expect(getOnboardingGuardRedirect("name", authed)).toBeNull();
    expect(getOnboardingGuardRedirect("method", authed)).toBe("/onboarding/name");
    expect(
      getOnboardingGuardRedirect("method", { ...authed, designSystemName: "Acme DS" }),
    ).toBeNull();
  });

  it("guards library by buildMethod and design system name", () => {
    const authed = { ...fresh, fakeAuthProvider: "github" as const, designSystemName: "Acme" };
    expect(getOnboardingGuardRedirect("library", authed)).toBe("/onboarding/method");
    expect(getOnboardingGuardRedirect("library", { ...authed, buildMethod: "library" })).toBeNull();
  });

  it("guards loading by starterId and design system name", () => {
    const lib = {
      ...fresh,
      fakeAuthProvider: "github" as const,
      designSystemName: "Acme",
      buildMethod: "library" as const,
    };
    expect(getOnboardingGuardRedirect("loading", lib)).toBe("/onboarding/method");
    expect(getOnboardingGuardRedirect("loading", { ...lib, starterId: "shadcn-ui" })).toBeNull();
  });

  it("guards brief by starterId — both scratch and library flows are admitted", () => {
    const authed = { ...fresh, fakeAuthProvider: "github" as const, designSystemName: "Acme" };
    // Without a starter, send the user back to pick a build method.
    expect(getOnboardingGuardRedirect("brief", authed)).toBe("/onboarding/method");
    // Scratch flow: starter is auto-set to modern-starter — brief is reachable.
    expect(
      getOnboardingGuardRedirect("brief", {
        ...authed,
        buildMethod: "scratch",
        starterId: "modern-starter",
      }),
    ).toBeNull();
    // Library flow: starter set to a chosen library — brief is also reachable.
    expect(
      getOnboardingGuardRedirect("brief", {
        ...authed,
        buildMethod: "library",
        starterId: "shadcn-ui",
      }),
    ).toBeNull();
  });
});

describe("resolveChatIndexOnboarding", () => {
  it("is null when not Electron or not authenticated", () => {
    expect(resolveChatIndexOnboarding(defaultAutodsmOnboardingState, false, true)).toBeNull();
    expect(resolveChatIndexOnboarding(defaultAutodsmOnboardingState, true, false)).toBeNull();
  });

  it("sends Electron users to onboarding when incomplete", () => {
    expect(resolveChatIndexOnboarding(defaultAutodsmOnboardingState, true, true)).toEqual({
      kind: "onboarding",
      to: "/onboarding/welcome",
    });
  });

  it("sends completed users to home when a workspace ref or DS exists", () => {
    expect(
      resolveChatIndexOnboarding({ ...defaultAutodsmOnboardingState, completed: true }, true, true),
    ).toEqual({ kind: "home", to: "/home" });
    expect(
      resolveChatIndexOnboarding(
        { ...defaultAutodsmOnboardingState, completed: true },
        true,
        true,
        { hasActiveWorkspaceProject: false, hasDesignSystemOnDisk: true },
      ),
    ).toEqual({ kind: "home", to: "/home" });
  });

  it("keeps completed users on the create picker when no design system exists", () => {
    expect(
      resolveChatIndexOnboarding(
        { ...defaultAutodsmOnboardingState, completed: true },
        true,
        true,
        { hasActiveWorkspaceProject: false, hasDesignSystemOnDisk: false },
      ),
    ).toBeNull();
  });

  it("auto-opens a matched workspace even when localStorage says not completed", () => {
    expect(
      resolveChatIndexOnboarding(defaultAutodsmOnboardingState, true, true, {
        hasActiveWorkspaceProject: false,
        hasDesignSystemOnDisk: true,
      }),
    ).toEqual({ kind: "home", to: "/home" });
  });
});

describe("isAutoDsmProjectCreationOnboardingSegment", () => {
  it("matches create-flow routes", () => {
    expect(isAutoDsmProjectCreationOnboardingSegment("create")).toBe(true);
    expect(isAutoDsmProjectCreationOnboardingSegment("name")).toBe(true);
    expect(isAutoDsmProjectCreationOnboardingSegment("loading")).toBe(true);
    expect(isAutoDsmProjectCreationOnboardingSegment("welcome")).toBe(false);
    expect(isAutoDsmProjectCreationOnboardingSegment("index")).toBe(false);
  });
});

describe("canReenterProjectCreationOnboarding", () => {
  it("allows completed users without a design system on create routes", () => {
    expect(
      canReenterProjectCreationOnboarding({
        onboardingCompleted: true,
        hasDesignSystemOnDisk: false,
        segment: "name",
      }),
    ).toBe(true);
  });

  it("blocks re-entry when a design system exists on disk", () => {
    expect(
      canReenterProjectCreationOnboarding({
        onboardingCompleted: true,
        hasDesignSystemOnDisk: true,
        segment: "name",
      }),
    ).toBe(false);
  });
});

describe("getOnboardingGuardRedirect completed re-entry", () => {
  it("does not force welcome when completed re-entry is allowed", () => {
    const completed = {
      ...defaultAutodsmOnboardingState,
      completed: true,
      fakeAuthProvider: "github" as const,
    };
    expect(
      getOnboardingGuardRedirect("name", completed, { allowCompletedReentry: true }),
    ).toBeNull();
  });
});

describe("isOnboardingAuthSatisfied", () => {
  it("is true when fakeAuthProvider is set in dev fallback mode", () => {
    expect(
      isOnboardingAuthSatisfied(
        {
          ...defaultAutodsmOnboardingState,
          fakeAuthProvider: "github",
        },
        {
          supabaseConfigured: false,
          supabaseSessionActive: false,
          supabaseBetaStatus: null,
        },
      ),
    ).toBe(true);
  });

  it("requires an approved Supabase session when configured", () => {
    expect(
      isOnboardingAuthSatisfied(defaultAutodsmOnboardingState, {
        supabaseConfigured: true,
        supabaseSessionActive: true,
        supabaseBetaStatus: "approved",
      }),
    ).toBe(true);
    expect(
      isOnboardingAuthSatisfied(
        { ...defaultAutodsmOnboardingState, fakeAuthProvider: "github" },
        {
          supabaseConfigured: true,
          supabaseSessionActive: true,
          supabaseBetaStatus: "pending",
        },
      ),
    ).toBe(false);
  });

  it("allows create when session is active and beta status is null", () => {
    expect(
      isOnboardingAuthSatisfied(defaultAutodsmOnboardingState, {
        supabaseConfigured: true,
        supabaseSessionActive: true,
        supabaseBetaStatus: null,
      }),
    ).toBe(true);
  });

  it("rejects create when Supabase session is missing", () => {
    expect(
      isOnboardingAuthSatisfied(defaultAutodsmOnboardingState, {
        supabaseConfigured: true,
        supabaseSessionActive: false,
        supabaseBetaStatus: null,
      }),
    ).toBe(false);
  });
});

describe("resolveOnboardingBetaStatus", () => {
  it("defaults null to approved", () => {
    expect(resolveOnboardingBetaStatus(null)).toBe("approved");
  });

  it("preserves pending and rejected", () => {
    expect(resolveOnboardingBetaStatus("pending")).toBe("pending");
    expect(resolveOnboardingBetaStatus("rejected")).toBe("rejected");
  });
});

describe("parseOnboardingPath", () => {
  it("maps known routes", () => {
    expect(parseOnboardingPath("/onboarding/welcome")).toBe("welcome");
    expect(parseOnboardingPath("/onboarding/beta")).toBe("beta");
    expect(parseOnboardingPath("/onboarding/name")).toBe("name");
    expect(parseOnboardingPath("/onboarding/brief")).toBe("brief");
    expect(parseOnboardingPath("/onboarding/loading")).toBe("loading");
  });

  it("normalizes trailing slashes on bare onboarding", () => {
    expect(parseOnboardingPath("/onboarding")).toBe("index");
    expect(parseOnboardingPath("/onboarding/")).toBe("index");
  });

  it("returns index for unknown subpaths", () => {
    expect(parseOnboardingPath("/onboarding/nope")).toBe("index");
  });
});

describe("mergeAutodsmOnboarding", () => {
  it("merges partial patches", () => {
    const next = mergeAutodsmOnboarding(defaultAutodsmOnboardingState, {
      fakeAuthProvider: "github",
    });
    expect(next.fakeAuthProvider).toBe("github");
    expect(next.completed).toBe(false);
  });

  it("allows clearing starterId", () => {
    const base = {
      ...defaultAutodsmOnboardingState,
      starterId: "mui" as const,
    };
    const next = mergeAutodsmOnboarding(base, { starterId: null });
    expect(next.starterId).toBeNull();
  });
});
