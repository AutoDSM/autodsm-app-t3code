/**
 * Visual split between chat/agent column and {@link WebContentsView}. Future: drag-to-resize wiring.
 */
export function PreviewSplitDivider() {
  return (
    <div
      role="presentation"
      aria-hidden
      data-slot="preview-split-divider"
      data-testid="preview-split-divider"
      className="h-px w-full shrink-0 bg-border md:hidden"
    />
  );
}
