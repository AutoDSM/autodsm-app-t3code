import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ComponentPreviewLoadingSkeleton } from "./ComponentPreviewLoadingSkeleton";

describe("ComponentPreviewLoadingSkeleton", () => {
  it("renders accessible loading status with skeleton blocks", () => {
    const html = renderToStaticMarkup(<ComponentPreviewLoadingSkeleton />);

    expect(html).toContain('data-testid="component-preview-loading-skeleton"');
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("Loading component preview");
    expect(html).toContain('data-slot="skeleton"');
  });

  it("supports overlay mode for viewport stacking", () => {
    const html = renderToStaticMarkup(<ComponentPreviewLoadingSkeleton overlay />);

    expect(html).toContain("absolute inset-0 z-10");
  });
});
