import { describe, expect, it } from "vitest";

import { shouldUseAutodsmComponentAgentSidebar } from "./autodsmSidebarMode";

describe("autodsmSidebarMode", () => {
  it("enables component-agent sidebar for materialized AutoDSM workspaces on desktop", () => {
    expect(
      shouldUseAutodsmComponentAgentSidebar({
        workspaceCwd: "/Users/me/.autodsm/systems/demo/system",
      }),
    ).toBe(true);
  });

  it("enables component-agent sidebar in Electron product mode regardless of active thread cwd", () => {
    expect(
      shouldUseAutodsmComponentAgentSidebar({
        workspaceCwd: "/Users/me/projects/server",
        isElectronProductMode: true,
        productMaterializedCwd: "/Users/me/.autodsm/systems/demo/system",
      }),
    ).toBe(true);
  });

  it("disables component-agent sidebar for non-materialized folders", () => {
    expect(
      shouldUseAutodsmComponentAgentSidebar({
        workspaceCwd: "/Users/me/projects/my-app",
      }),
    ).toBe(false);
  });
});
