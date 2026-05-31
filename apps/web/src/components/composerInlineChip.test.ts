import { describe, expect, it } from "vitest";

import { COMPOSER_INLINE_BRAND_TOKEN_CHIP_CLASS_NAME } from "./composerInlineChip";

describe("composerInlineChip", () => {
  it("uses brand-tint styling for brand-token chips", () => {
    expect(COMPOSER_INLINE_BRAND_TOKEN_CHIP_CLASS_NAME).toContain("text-brand");
    expect(COMPOSER_INLINE_BRAND_TOKEN_CHIP_CLASS_NAME).toContain("border");
  });
});
