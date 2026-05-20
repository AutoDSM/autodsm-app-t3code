const SIDEBAR_WRAPPER_SELECTOR = '[data-slot="sidebar-wrapper"]';
const SIDEBAR_INSET_SELECTOR = '[data-slot="sidebar-inset"]';
const PREVIEW_CELL_SELECTOR = '[data-slot="component-preview-cell"]';
const PREVIEW_SPLIT_ROOT_SELECTOR = '[data-slot="component-preview-split-root"]';

function isActiveLayoutDrag(): boolean {
  return (
    document.body.dataset.companionAgentSplitDragging === "1" ||
    document.body.dataset.sidebarWidthDragging === "1"
  );
}

function collectLayoutObservationTargets(element: HTMLElement): HTMLElement[] {
  const targets = new Set<HTMLElement>([element]);

  const previewCell = element.closest<HTMLElement>(PREVIEW_CELL_SELECTOR);
  if (previewCell) {
    targets.add(previewCell);
  }

  const splitRoot = element.closest<HTMLElement>(PREVIEW_SPLIT_ROOT_SELECTOR);
  if (splitRoot) {
    targets.add(splitRoot);
  }

  let parent = element.parentElement;
  while (parent && parent !== document.body) {
    targets.add(parent);
    if (parent.matches(SIDEBAR_WRAPPER_SELECTOR)) {
      break;
    }
    parent = parent.parentElement;
  }

  const sidebarInset = document.querySelector<HTMLElement>(SIDEBAR_INSET_SELECTOR);
  if (sidebarInset) {
    targets.add(sidebarInset);
  }

  const sidebarWrapper = document.querySelector<HTMLElement>(SIDEBAR_WRAPPER_SELECTOR);
  if (sidebarWrapper) {
    targets.add(sidebarWrapper);
  }

  const splitRootGlobal = document.querySelector<HTMLElement>(PREVIEW_SPLIT_ROOT_SELECTOR);
  if (splitRootGlobal) {
    targets.add(splitRootGlobal);
  }

  return [...targets];
}

export interface ObserveComponentPreviewLayoutSyncInput {
  readonly element: HTMLElement;
  readonly onSync: () => void;
}

/**
 * Keeps native Electron preview bounds aligned while sidebars, splitters, scroll, and
 * window geometry change. ResizeObserver alone misses positional shifts that do not
 * resize the measured host element.
 */
export function observeComponentPreviewLayoutSync(
  input: ObserveComponentPreviewLayoutSyncInput,
): () => void {
  const { element, onSync } = input;

  let rafId: number | null = null;
  let dragLoopId: number | null = null;

  const scheduleSync = () => {
    if (rafId !== null) {
      return;
    }
    rafId = requestAnimationFrame(() => {
      rafId = null;
      onSync();
    });
  };

  const startDragLoopIfNeeded = () => {
    if (dragLoopId !== null || !isActiveLayoutDrag()) {
      return;
    }
    const tick = () => {
      if (!isActiveLayoutDrag()) {
        dragLoopId = null;
        return;
      }
      onSync();
      dragLoopId = requestAnimationFrame(tick);
    };
    dragLoopId = requestAnimationFrame(tick);
  };

  const layoutTargets = collectLayoutObservationTargets(element);
  const resizeObserver = new ResizeObserver(() => {
    scheduleSync();
    startDragLoopIfNeeded();
  });
  for (const target of layoutTargets) {
    resizeObserver.observe(target);
  }

  const onWindowResize = () => {
    scheduleSync();
  };
  window.addEventListener("resize", onWindowResize);

  const onWindowScroll = () => {
    scheduleSync();
  };
  window.addEventListener("scroll", onWindowScroll, { capture: true, passive: true });

  const viewport = window.visualViewport;
  const onViewportChange = () => {
    scheduleSync();
  };
  viewport?.addEventListener("resize", onViewportChange);
  viewport?.addEventListener("scroll", onViewportChange);

  const mutationObserver = new MutationObserver(() => {
    scheduleSync();
    startDragLoopIfNeeded();
  });
  mutationObserver.observe(document.body, {
    attributes: true,
    attributeFilter: [
      "data-companion-agent-split-dragging",
      "data-sidebar-width-dragging",
      "style",
      "class",
    ],
  });

  const sidebarWrapper = document.querySelector<HTMLElement>(SIDEBAR_WRAPPER_SELECTOR);
  if (sidebarWrapper) {
    mutationObserver.observe(sidebarWrapper, {
      attributes: true,
      attributeFilter: ["style", "class"],
    });
  }

  scheduleSync();

  return () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
    }
    if (dragLoopId !== null) {
      cancelAnimationFrame(dragLoopId);
    }
    resizeObserver.disconnect();
    window.removeEventListener("resize", onWindowResize);
    window.removeEventListener("scroll", onWindowScroll, { capture: true });
    viewport?.removeEventListener("resize", onViewportChange);
    viewport?.removeEventListener("scroll", onViewportChange);
    mutationObserver.disconnect();
  };
}
