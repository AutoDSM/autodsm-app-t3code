import { ComponentPreviewTabBar } from "~/components/ComponentPreviewTabBar";
import { PreviewSplitDivider } from "~/components/PreviewSplitDivider";
import { WebContentsView } from "~/components/WebContentsView";

export interface ComponentPreviewShellProps {
  readonly componentPath: string | null;
  readonly onClosePreview: () => void;
}

/**
 * Shared layout for sandbox and (visually aligned) production split; keeps agent vs preview regions consistent.
 */
export function ComponentPreviewShell(props: ComponentPreviewShellProps) {
  const { componentPath, onClosePreview } = props;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
      {componentPath ? (
        <ComponentPreviewTabBar relativePath={componentPath} onClose={onClosePreview} />
      ) : null}
      <div
        className={
          componentPath
            ? "flex min-h-0 min-w-0 flex-1 flex-col md:flex-row"
            : "flex min-h-0 min-w-0 flex-1 flex-col"
        }
      >
        <div className="flex min-h-0 min-w-0 flex-1 flex-col border-border border-dashed md:border-0">
          <div className="flex min-h-0 flex-1 flex-col p-4 text-sm text-muted-foreground md:p-6">
            Agent / composer region (sandbox placeholder).
          </div>
        </div>
        {componentPath ? (
          <>
            <PreviewSplitDivider />
            <div className="hidden shrink-0 bg-border md:block md:h-full md:w-px md:touch-none md:cursor-col-resize" />
            <WebContentsView relativePath={componentPath} />
          </>
        ) : null}
      </div>
    </div>
  );
}
