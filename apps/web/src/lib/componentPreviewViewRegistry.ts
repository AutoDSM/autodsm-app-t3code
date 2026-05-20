import { hiddenComponentPreviewNativeBounds } from "~/lib/componentPreviewNativeBounds";

const activeViewIds = new Set<string>();

export function registerComponentPreviewView(viewId: string): void {
  activeViewIds.add(viewId);
}

export function unregisterComponentPreviewView(viewId: string): void {
  activeViewIds.delete(viewId);
}

export function getRegisteredComponentPreviewViewIds(): readonly string[] {
  return [...activeViewIds];
}

/** Moves native preview off-screen, then detaches a single registered view. */
export function hideAndDetachComponentPreviewView(viewId: string): void {
  const bridge = typeof window !== "undefined" ? window.desktopBridge : undefined;
  if (!bridge?.detachComponentPreview) {
    return;
  }
  void bridge.setComponentPreviewBounds?.({
    viewId,
    bounds: hiddenComponentPreviewNativeBounds(),
  });
  void bridge.detachComponentPreview(viewId);
}

/**
 * Detaches every renderer-tracked preview view and asks desktop to sweep any
 * stale native WebContentsView children as a safety valve.
 */
export function detachAllComponentPreviewViews(): void {
  for (const viewId of activeViewIds) {
    hideAndDetachComponentPreviewView(viewId);
  }
  activeViewIds.clear();
  void window.desktopBridge?.detachAllComponentPreview?.();
}

/** Test-only: reset registry between unit tests. */
export function resetComponentPreviewViewRegistryForTests(): void {
  activeViewIds.clear();
}
