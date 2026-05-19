import { useMemo } from "react";

import { ComponentPreviewTabBar } from "~/components/ComponentPreviewTabBar";
import { PreviewSplitDivider } from "~/components/PreviewSplitDivider";
import { WebContentsView } from "~/components/WebContentsView";
import { dedupeStableSorted } from "~/lib/srcComponentsWorkspacePaths";

export interface ComponentPreviewShellProps {
  readonly catalogPaths: readonly string[];
  readonly componentPath: string | null;
  readonly onSelectComponentPath: (path: string) => void;
  readonly onClosePreview: () => void;
}

/**
 * Shared layout for sandbox and (visually aligned) production split; keeps preview center | agent right.
 */
export function ComponentPreviewShell(props: ComponentPreviewShellProps) {
  const { catalogPaths, componentPath, onSelectComponentPath, onClosePreview } = props;

  const tabPaths = useMemo(
    () =>
      dedupeStableSorted([
        ...catalogPaths,
        ...(componentPath !== null && catalogPaths.every((p) => p !== componentPath)
          ? [componentPath]
          : []),
      ]),
    [catalogPaths, componentPath],
  );

  const showTabStrip = tabPaths.length > 0;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
      {showTabStrip ? (
        <ComponentPreviewTabBar
          paths={tabPaths}
          activePath={componentPath}
          onSelectPath={onSelectComponentPath}
          onCloseActive={onClosePreview}
        />
      ) : null}
      <div
        className={
          componentPath
            ? "flex min-h-0 min-w-0 flex-1 flex-col md:flex-row"
            : "flex min-h-0 min-w-0 flex-1 flex-col"
        }
      >
        {componentPath ? (
          <>
            <WebContentsView relativePath={componentPath} />
            <PreviewSplitDivider />
            <div className="hidden shrink-0 bg-border md:block md:h-full md:w-px md:touch-none md:cursor-col-resize" />
          </>
        ) : null}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col border-border border-dashed md:border-0">
          <div className="flex min-h-0 flex-1 flex-col p-4 text-sm text-muted-foreground md:p-6">
            Agent / composer region (sandbox placeholder).
          </div>
        </div>
      </div>
    </div>
  );
}
