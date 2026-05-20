import { describe, expect, it, vi } from "vitest";

import {
  boundsFromDomRect,
  clampComponentPreviewNativeBounds,
  emptyComponentPreviewNativeBounds,
  hiddenComponentPreviewNativeBounds,
  measureComponentPreviewHostBounds,
  resolveComponentPreviewNativeBounds,
  shouldHideComponentPreviewNativeBounds,
  waitForComponentPreviewHostLayout,
} from "./componentPreviewNativeBounds";

describe("componentPreviewNativeBounds", () => {
  it("rounds DOMRect values and clamps negative sizes to zero", () => {
    expect(
      boundsFromDomRect({
        x: 10.4,
        y: 20.6,
        width: 100.2,
        height: 50.8,
      } as DOMRectReadOnly),
    ).toEqual({ x: 10, y: 21, width: 100, height: 51 });
  });

  it("returns empty bounds helper", () => {
    expect(emptyComponentPreviewNativeBounds()).toEqual({ x: 0, y: 0, width: 0, height: 0 });
  });

  it("returns off-screen bounds for hidden native preview", () => {
    expect(hiddenComponentPreviewNativeBounds()).toEqual({
      x: -10_000,
      y: -10_000,
      width: 1,
      height: 1,
    });
  });

  it("clamps host bounds to the preview cell rect", () => {
    expect(
      clampComponentPreviewNativeBounds({ x: 100, y: 50, width: 500, height: 400 }, {
        x: 200,
        y: 60,
        width: 300,
        height: 350,
      } as DOMRectReadOnly),
    ).toEqual({ x: 200, y: 60, width: 300, height: 350 });
  });

  it("resolves hidden bounds while overlay suppression is active", () => {
    const element = {
      getBoundingClientRect: () =>
        ({
          x: 10,
          y: 20,
          width: 500,
          height: 400,
        }) as DOMRectReadOnly,
    } as HTMLElement;

    expect(
      resolveComponentPreviewNativeBounds({
        element,
        isIntersecting: true,
        suppressForOverlay: true,
      }),
    ).toEqual(hiddenComponentPreviewNativeBounds());
  });

  it("hides preview when not intersecting or zero area", () => {
    expect(
      shouldHideComponentPreviewNativeBounds({ x: 0, y: 0, width: 100, height: 100 }, false),
    ).toBe(true);
    expect(
      shouldHideComponentPreviewNativeBounds({ x: 0, y: 0, width: 0, height: 100 }, true),
    ).toBe(true);
    expect(
      shouldHideComponentPreviewNativeBounds({ x: 0, y: 0, width: 100, height: 0 }, true),
    ).toBe(true);
    expect(
      shouldHideComponentPreviewNativeBounds({ x: 0, y: 0, width: 100, height: 100 }, true),
    ).toBe(false);
  });

  it("hides preview while a transient overlay such as the model picker is open", () => {
    expect(
      shouldHideComponentPreviewNativeBounds({ x: 0, y: 0, width: 400, height: 300 }, true, {
        suppressForOverlay: true,
      }),
    ).toBe(true);
  });

  it("measures host bounds clamped to the preview cell", () => {
    const element = {
      getBoundingClientRect: () =>
        ({
          x: 100,
          y: 50,
          width: 500,
          height: 400,
        }) as DOMRectReadOnly,
      closest: () =>
        ({
          getBoundingClientRect: () =>
            ({
              x: 200,
              y: 60,
              width: 300,
              height: 350,
            }) as DOMRectReadOnly,
        }) as HTMLElement,
    } as unknown as HTMLElement;

    expect(measureComponentPreviewHostBounds({ element })).toEqual({
      x: 200,
      y: 60,
      width: 300,
      height: 350,
    });
  });

  it("waits until host layout is non-zero before native attach", async () => {
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(0);
      return 0;
    });

    const element = {
      getBoundingClientRect: () =>
        ({
          x: 10,
          y: 20,
          width: 400,
          height: 200,
        }) as DOMRectReadOnly,
      closest: () => null,
    } as unknown as HTMLElement;

    const bounds = await waitForComponentPreviewHostLayout({ element, maxFrames: 3 });
    expect(bounds.width).toBe(400);
  });
});
