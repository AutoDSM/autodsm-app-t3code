import { describe, expect, it } from "vitest";

import { isAutodsmMaterializedSystemCwd } from "./autodsmMaterializedWorkspace";

describe("isAutodsmMaterializedSystemCwd", () => {
  it("detects materialized AutoDSM system roots", () => {
    expect(isAutodsmMaterializedSystemCwd("/Users/me/.autodsm/systems/abc123/system")).toBe(true);
  });

  it("rejects non-materialized project folders", () => {
    expect(isAutodsmMaterializedSystemCwd("/Users/me/projects/my-app")).toBe(false);
  });

  it("detects Windows-style separators under .autodsm/systems", () => {
    expect(isAutodsmMaterializedSystemCwd("C:\\Users\\me\\.autodsm\\systems\\abc123\\system")).toBe(
      true,
    );
  });
});
