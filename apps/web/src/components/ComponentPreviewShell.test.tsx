import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ComponentPreviewShell } from "./ComponentPreviewShell";

vi.mock("./WebContentsView", () => ({
  WebContentsView: ({ relativePath }: { relativePath: string | null }) => (
    <div data-testid="web-contents-view" data-component-path={relativePath ?? ""} />
  ),
}));

describe("ComponentPreviewShell layout", () => {
  it("renders preview before the agent placeholder on desktop split rows", () => {
    const html = renderToStaticMarkup(
      <ComponentPreviewShell
        catalogPaths={["src/components/Button.tsx"]}
        componentPath="src/components/Button.tsx"
        onSelectComponentPath={() => {}}
        onClosePreview={() => {}}
      />,
    );

    const previewIndex = html.indexOf('data-testid="web-contents-view"');
    const agentIndex = html.indexOf("Agent / composer region");
    expect(previewIndex).toBeGreaterThan(-1);
    expect(agentIndex).toBeGreaterThan(-1);
    expect(previewIndex).toBeLessThan(agentIndex);
  });
});
