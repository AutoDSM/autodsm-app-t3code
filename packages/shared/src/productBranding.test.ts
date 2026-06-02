import { describe, expect, it } from "vitest";

import { PRODUCT_BASE_NAME, resolveProductDisplayName } from "./productBranding.ts";

describe("productBranding", () => {
  it("uses AutoDSM as the product base name", () => {
    expect(PRODUCT_BASE_NAME).toBe("AutoDSM");
  });

  it("ships the stable channel as the bare product name", () => {
    expect(resolveProductDisplayName("Alpha")).toBe("AutoDSM");
    expect(resolveProductDisplayName("Latest")).toBe("AutoDSM");
    expect(resolveProductDisplayName("")).toBe("AutoDSM");
  });

  it("suffixes pre-release channels so builds stay distinguishable", () => {
    expect(resolveProductDisplayName("Dev")).toBe("AutoDSM (Dev)");
    expect(resolveProductDisplayName("Nightly")).toBe("AutoDSM (Nightly)");
  });
});
