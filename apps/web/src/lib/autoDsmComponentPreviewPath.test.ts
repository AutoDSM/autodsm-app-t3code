import { describe, expect, it } from "vitest";

import {
  canonicalAutoDsmComponentPreviewPath,
  canonicalAutoDsmComponentPreviewPaths,
} from "./autoDsmComponentPreviewPath";

describe("autoDsmComponentPreviewPath", () => {
  it("normalizes leading slashes to slashless catalog paths", () => {
    expect(canonicalAutoDsmComponentPreviewPath("/src/components/ui/button.tsx")).toBe(
      "src/components/ui/button.tsx",
    );
  });

  it("drops invalid component paths", () => {
    expect(canonicalAutoDsmComponentPreviewPath("README.md")).toBeNull();
  });

  it("canonicalizes path maps", () => {
    expect(
      canonicalAutoDsmComponentPreviewPaths({
        "env:thr-1": "/src/components/ui/badge.tsx",
      }),
    ).toEqual({
      "env:thr-1": "src/components/ui/badge.tsx",
    });
  });
});
