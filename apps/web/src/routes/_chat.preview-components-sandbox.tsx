import { createFileRoute, redirect } from "@tanstack/react-router";
import { useCallback, useState } from "react";

import { ComponentPreviewShell } from "~/components/ComponentPreviewShell";
import { SrcComponentsSidebarCatalogBlock } from "~/components/SidebarSrcComponentsCatalog";
import { SidebarInset } from "~/components/ui/sidebar";
import {
  SANDBOX_COMPONENT_RELATIVE_PATH,
  sandboxSrcComponentsCatalogViewModel,
} from "~/dev/componentPreviewSandbox/fixture";

function PreviewComponentsSandboxRouteView() {
  const catalog = sandboxSrcComponentsCatalogViewModel();
  const [folderExpanded, setFolderExpanded] = useState(true);
  const [previewPath, setPreviewPath] = useState<string | null>(SANDBOX_COMPONENT_RELATIVE_PATH);

  const closePreview = useCallback(() => setPreviewPath(null), []);
  const onPickComponentPath = useCallback((relativePath: string) => {
    setPreviewPath(relativePath);
  }, []);

  return (
    <SidebarInset className="h-svh min-h-0 overflow-hidden overscroll-y-none bg-background text-foreground md:h-dvh">
      <header className="shrink-0 border-b border-border px-4 py-2">
        <h1 className="text-sm font-medium text-foreground">Component preview sandbox (DEV)</h1>
        <p className="text-muted-foreground text-xs">Fixture catalog only—no workspace indexing.</p>
      </header>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col md:flex-row">
        <aside className="shrink-0 border-border border-b bg-card md:flex md:w-[17rem] md:flex-col md:border-r md:border-b-0">
          <div className="min-h-0 flex-1 overflow-y-auto pb-4">
            <SrcComponentsSidebarCatalogBlock
              catalog={catalog}
              folderExpanded={folderExpanded}
              onToggleFolderExpanded={() => setFolderExpanded((open) => !open)}
              previewPathActive={previewPath ?? undefined}
              canPickThreads
              onPickComponentPath={onPickComponentPath}
            />
          </div>
        </aside>
        <ComponentPreviewShell
          catalogPaths={catalog.paths}
          componentPath={previewPath}
          onSelectComponentPath={onPickComponentPath}
          onClosePreview={closePreview}
        />
      </div>
    </SidebarInset>
  );
}

export const Route = createFileRoute("/_chat/preview-components-sandbox")({
  beforeLoad: () => {
    if (!import.meta.env.DEV) {
      throw redirect({ to: "/", replace: true });
    }
  },
  component: PreviewComponentsSandboxRouteView,
});
