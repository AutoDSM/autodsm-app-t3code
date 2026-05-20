export interface ComponentPreviewNativeBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export function boundsFromDomRect(rect: DOMRectReadOnly): ComponentPreviewNativeBounds {
  return {
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width: Math.max(0, Math.round(rect.width)),
    height: Math.max(0, Math.round(rect.height)),
  };
}

export function emptyComponentPreviewNativeBounds(): ComponentPreviewNativeBounds {
  return { x: 0, y: 0, width: 0, height: 0 };
}

/** Move the native Electron preview off-screen (0×0 bounds can leave a stale composite). */
export function hiddenComponentPreviewNativeBounds(): ComponentPreviewNativeBounds {
  return { x: -10_000, y: -10_000, width: 1, height: 1 };
}

export function shouldHideComponentPreviewNativeBounds(
  bounds: ComponentPreviewNativeBounds,
  isIntersecting: boolean,
  options?: { readonly suppressForOverlay?: boolean },
): boolean {
  if (options?.suppressForOverlay) {
    return true;
  }
  return !isIntersecting || bounds.width <= 0 || bounds.height <= 0;
}

export function clampComponentPreviewNativeBounds(
  bounds: ComponentPreviewNativeBounds,
  cellRect: DOMRectReadOnly,
): ComponentPreviewNativeBounds {
  const hostLeft = bounds.x;
  const hostTop = bounds.y;
  const hostRight = bounds.x + bounds.width;
  const hostBottom = bounds.y + bounds.height;

  const cellLeft = Math.round(cellRect.x);
  const cellTop = Math.round(cellRect.y);
  const cellRight = Math.round(cellRect.x + cellRect.width);
  const cellBottom = Math.round(cellRect.y + cellRect.height);

  const left = Math.max(hostLeft, cellLeft);
  const top = Math.max(hostTop, cellTop);
  const right = Math.min(hostRight, cellRight);
  const bottom = Math.min(hostBottom, cellBottom);

  return {
    x: left,
    y: top,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  };
}

export function measureComponentPreviewHostBounds(input: {
  readonly element: HTMLElement;
  readonly cellElement?: HTMLElement | null;
}): ComponentPreviewNativeBounds {
  const hostBounds = boundsFromDomRect(input.element.getBoundingClientRect());
  const cellElement =
    input.cellElement ?? input.element.closest<HTMLElement>('[data-slot="component-preview-cell"]');
  if (cellElement !== null && cellElement !== undefined) {
    return clampComponentPreviewNativeBounds(hostBounds, cellElement.getBoundingClientRect());
  }
  return hostBounds;
}

/** Waits until the preview host has non-zero layout before native attach on reload. */
export async function waitForComponentPreviewHostLayout(input: {
  readonly element: HTMLElement;
  readonly cellElement?: HTMLElement | null;
  readonly maxFrames?: number;
}): Promise<ComponentPreviewNativeBounds> {
  const maxFrames = input.maxFrames ?? 60;
  for (let frame = 0; frame < maxFrames; frame += 1) {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
    const bounds = measureComponentPreviewHostBounds(input);
    if (bounds.width > 0 && bounds.height > 0) {
      return bounds;
    }
  }
  return measureComponentPreviewHostBounds(input);
}

export function resolveComponentPreviewNativeBounds(input: {
  readonly element: HTMLElement;
  readonly isIntersecting: boolean;
  readonly suppressForOverlay?: boolean;
  readonly cellElement?: HTMLElement | null;
}): ComponentPreviewNativeBounds {
  if (input.suppressForOverlay) {
    return hiddenComponentPreviewNativeBounds();
  }

  const clampedBounds = measureComponentPreviewHostBounds(
    input.cellElement === undefined
      ? { element: input.element }
      : { element: input.element, cellElement: input.cellElement },
  );

  if (shouldHideComponentPreviewNativeBounds(clampedBounds, input.isIntersecting)) {
    return hiddenComponentPreviewNativeBounds();
  }
  return clampedBounds;
}
