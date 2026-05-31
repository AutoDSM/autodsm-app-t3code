import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { AutoDsmBrandToken } from "@t3tools/contracts";

import { DesignTokenIconsSection } from "./DesignTokenIconsSection";

describe("DesignTokenIconsSection", () => {
  it("renders empty-state install affordance when no library token", () => {
    const html = renderToStaticMarkup(
      <DesignTokenIconsSection
        iconLibraryToken={null}
        installPending={false}
        onInstallLibrary={vi.fn()}
      />,
    );

    expect(html).toContain("Add an icon library");
    expect(html).toContain("No icon library is configured");
  });

  it("renders lucide grid when icon-library token is set", () => {
    const token: AutoDsmBrandToken = {
      id: "config:icon-library",
      category: "icon",
      name: "icon-library",
      value: "lucide",
      origin: "scanned",
      sources: ["/components.json"],
    };
    const html = renderToStaticMarkup(
      <DesignTokenIconsSection
        iconLibraryToken={token}
        installPending={false}
        onInstallLibrary={vi.fn()}
      />,
    );

    expect(html).toContain("Search icons");
    expect(html).toContain('placeholder="Search icons');
  });
});
