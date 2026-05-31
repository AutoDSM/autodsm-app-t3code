import { describe, expect, it } from "vitest";

import { PRODUCT_BASE_NAME, resolveProductDisplayName } from "./productBranding.ts";

describe("productBranding", () => {
  it("uses AutoDSM as the product base name", () => {
    expect(PRODUCT_BASE_NAME).toBe("AutoDSM");
  });

  it("builds display names from stage labels", () => {
    expect(resolveProductDisplayName("Alpha")).toBe("AutoDSM (Alpha)");
    expect(resolveProductDisplayName("Dev")).toBe("AutoDSM (Dev)");
    expect(resolveProductDisplayName("Nightly")).toBe("AutoDSM (Nightly)");
  });
});
