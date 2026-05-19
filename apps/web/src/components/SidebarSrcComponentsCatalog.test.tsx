import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SrcComponentsSidebarCatalogBlock } from "~/components/SidebarSrcComponentsCatalog";
import type { SrcComponentsCatalogViewModel } from "~/lib/srcComponentsCatalog";
import { SidebarProvider } from "~/components/ui/sidebar";
import { TooltipProvider } from "~/components/ui/tooltip";

function renderCatalogBlock(props: {
  readonly catalog: SrcComponentsCatalogViewModel;
  readonly previewPathActive?: string;
  readonly folderExpanded?: boolean;
  readonly canPickThreads?: boolean;
}) {
  const { catalog, previewPathActive, folderExpanded = true, canPickThreads = true } = props;
  return renderToStaticMarkup(
    <SidebarProvider>
      <TooltipProvider>
        <SrcComponentsSidebarCatalogBlock
          catalog={catalog}
          folderExpanded={folderExpanded}
          onToggleFolderExpanded={() => {}}
          previewPathActive={previewPathActive}
          canPickThreads={canPickThreads}
          onPickComponentPath={() => {}}
        />
      </TooltipProvider>
    </SidebarProvider>,
  );
}

describe("SrcComponentsSidebarCatalogBlock", () => {
  it("renders src/components tree roots expanded by default with nested folders", () => {
    const catalog: SrcComponentsCatalogViewModel = {
      folderLabel: ".tsx / .jsx previews under …/src/components/",
      paths: [
        "apps/web/src/components/autodsm/AutoDsm.tsx",
        "apps/web/src/components/ChatView.tsx",
      ],
      isPending: false,
      isError: false,
      truncated: false,
      gate: null,
    };

    const html = renderCatalogBlock({ catalog });

    expect(html).toContain('data-testid="src-components-tree-root:apps/web/src/components"');
    expect(html).toContain(
      'data-testid="src-components-tree-folder:apps/web/src/components/autodsm"',
    );
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain("ChatView.tsx");
    expect(html).toContain("AutoDsm.tsx");
  });

  it("marks only the active preview file row", () => {
    const activePath = "apps/web/src/components/ChatView.tsx";
    const catalog: SrcComponentsCatalogViewModel = {
      folderLabel: "label",
      paths: [activePath, "apps/web/src/components/autodsm/X.tsx"],
      isPending: false,
      isError: false,
      truncated: false,
      gate: null,
    };

    const html = renderCatalogBlock({ catalog, previewPathActive: activePath });
    const matches = html.match(/data-active="true"/g);
    expect(matches?.length).toBe(1);
    expect(html).toContain(`>${activePath}</span>`);
  });

  it("renders per-root truncation hints when truncated", () => {
    const catalog: SrcComponentsCatalogViewModel = {
      folderLabel: "label",
      paths: ["apps/web/src/components/A.tsx", "packages/ui/src/components/B.tsx"],
      isPending: false,
      isError: false,
      truncated: true,
      gate: null,
    };

    const html = renderCatalogBlock({ catalog });
    const hints = html.match(/data-testid="src-components-catalog-truncation-hint"/g);
    expect(hints?.length).toBe(2);
    expect(html).toContain('data-root-path="apps/web/src/components"');
    expect(html).toContain('data-root-path="packages/ui/src/components"');
  });
});
