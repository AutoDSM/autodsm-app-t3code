import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ComponentPreviewTabBar } from "./ComponentPreviewTabBar";

describe("ComponentPreviewTabBar", () => {
  it("renders one tab per catalog path and marks the active tab", () => {
    const html = renderToStaticMarkup(
      <ComponentPreviewTabBar
        paths={["src/components/A.tsx", "apps/web/src/components/B.tsx"]}
        activePath="src/components/A.tsx"
        onSelectPath={() => {}}
        onCloseActive={() => {}}
      />,
    );

    expect(html).toContain('role="tablist"');
    expect((html.match(/role="tab"/g) ?? []).length).toBe(2);
    expect(html).toContain('data-testid="component-preview-tab:src/components/A.tsx"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('data-testid="component-preview-tab:apps/web/src/components/B.tsx"');
    expect(html).toContain("Close component preview");
  });

  it("omits the close control when there is no active preview path", () => {
    const html = renderToStaticMarkup(
      <ComponentPreviewTabBar
        paths={["src/components/A.tsx"]}
        activePath={null}
        onSelectPath={() => {}}
        onCloseActive={() => {}}
      />,
    );

    expect(html).not.toContain("Close component preview");
  });
});
