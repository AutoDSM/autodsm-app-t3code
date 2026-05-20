import { describe, expect, it } from "vitest";

import {
  isComponentPreviewAllowedOnRoute,
  shouldDetachAllComponentPreviewsOnRoute,
} from "./componentPreviewRouteScope";

describe("componentPreviewRouteScope", () => {
  it("allows preview on thread routes with componentPath", () => {
    expect(
      isComponentPreviewAllowedOnRoute({
        pathname: "/env-1/thread-1",
        search: { componentPath: "src/components/Button.tsx" },
      }),
    ).toBe(true);
    expect(
      shouldDetachAllComponentPreviewsOnRoute({
        pathname: "/env-1/thread-1",
        search: { componentPath: "src/components/Button.tsx" },
      }),
    ).toBe(false);
  });

  it("requires detach on home and other non-preview pages", () => {
    expect(
      shouldDetachAllComponentPreviewsOnRoute({
        pathname: "/home",
        search: {},
      }),
    ).toBe(true);
    expect(
      shouldDetachAllComponentPreviewsOnRoute({
        pathname: "/design-tokens",
        search: {},
      }),
    ).toBe(true);
  });

  it("requires detach on thread routes without componentPath", () => {
    expect(
      shouldDetachAllComponentPreviewsOnRoute({
        pathname: "/env-1/thread-1",
        search: {},
      }),
    ).toBe(true);
  });

  it("does not detach on the dev preview sandbox route", () => {
    expect(
      shouldDetachAllComponentPreviewsOnRoute({
        pathname: "/preview-components-sandbox",
        search: {},
      }),
    ).toBe(false);
  });
});
