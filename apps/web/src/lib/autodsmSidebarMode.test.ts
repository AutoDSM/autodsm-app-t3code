import { describe, expect, it } from "vitest";

import { shouldUseAutodsmComponentAgentSidebar } from "./autodsmSidebarMode";

describe("shouldUseAutodsmComponentAgentSidebar", () => {
  it("returns true for materialized AutoDSM workspace cwd", () => {
    expect(
      shouldUseAutodsmComponentAgentSidebar({
        workspaceCwd: "/Users/me/.autodsm/systems/ws-1/system",
      }),
    ).toBe(true);
  });

  it("returns false for non-materialized cwd", () => {
    expect(
      shouldUseAutodsmComponentAgentSidebar({
        workspaceCwd: "/Users/me/projects/my-app",
      }),
    ).toBe(false);
  });

  it("returns false when cwd is empty", () => {
    expect(shouldUseAutodsmComponentAgentSidebar({ workspaceCwd: null })).toBe(false);
    expect(shouldUseAutodsmComponentAgentSidebar({ workspaceCwd: "  " })).toBe(false);
  });
});
