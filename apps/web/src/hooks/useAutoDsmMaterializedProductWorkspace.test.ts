import { describe, expect, it } from "vitest";

import { shouldUseAutodsmComponentAgentSidebar } from "~/lib/autodsmSidebarMode";

describe("useAutoDsmMaterializedProductWorkspace integration", () => {
  it("product sidebar mode stays enabled when the active chat thread is a non-materialized project", () => {
    expect(
      shouldUseAutodsmComponentAgentSidebar({
        workspaceCwd: "/Users/sebastianmendo/autodsm-ai/ts-code/t3code/apps/server",
        isElectronProductMode: true,
        productMaterializedCwd: "/Users/me/.autodsm/systems/abc123/system",
      }),
    ).toBe(true);
  });
});
