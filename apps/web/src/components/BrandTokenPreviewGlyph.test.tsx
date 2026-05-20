import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { BrandTokenPreviewGlyph } from "./BrandTokenPreviewGlyph";

describe("BrandTokenPreviewGlyph", () => {
  it("renders a T preview for typography tokens", () => {
    const html = renderToStaticMarkup(
      <BrandTokenPreviewGlyph token={{ category: "typography", value: "Manrope 16px" }} />,
    );

    expect(html).toContain(">T<");
    expect(html).not.toContain("rounded-full");
  });

  it("renders a color swatch for color tokens", () => {
    const html = renderToStaticMarkup(
      <BrandTokenPreviewGlyph
        token={{
          category: "color",
          value: "#8a38f5",
          color: { light: "#8a38f5", dark: "#a366ff" },
        }}
      />,
    );

    expect(html).toContain("rounded-full");
    expect(html).toContain("#8a38f5");
  });
});
