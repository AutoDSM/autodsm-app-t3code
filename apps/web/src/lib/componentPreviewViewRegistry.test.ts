import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  detachAllComponentPreviewViews,
  getRegisteredComponentPreviewViewIds,
  hideAndDetachComponentPreviewView,
  registerComponentPreviewView,
  resetComponentPreviewViewRegistryForTests,
  unregisterComponentPreviewView,
} from "./componentPreviewViewRegistry";

describe("componentPreviewViewRegistry", () => {
  beforeEach(() => {
    resetComponentPreviewViewRegistryForTests();
    vi.stubGlobal("window", {
      desktopBridge: {
        setComponentPreviewBounds: vi.fn(),
        detachComponentPreview: vi.fn(),
        detachAllComponentPreview: vi.fn(),
      },
    });
  });

  it("tracks registered view ids", () => {
    registerComponentPreviewView("view-a");
    registerComponentPreviewView("view-b");
    expect(getRegisteredComponentPreviewViewIds()).toEqual(["view-a", "view-b"]);
    unregisterComponentPreviewView("view-a");
    expect(getRegisteredComponentPreviewViewIds()).toEqual(["view-b"]);
  });

  it("hides bounds before detaching a single view", () => {
    hideAndDetachComponentPreviewView("view-1");
    expect(window.desktopBridge?.setComponentPreviewBounds).toHaveBeenCalledWith({
      viewId: "view-1",
      bounds: { x: -10_000, y: -10_000, width: 1, height: 1 },
    });
    expect(window.desktopBridge?.detachComponentPreview).toHaveBeenCalledWith("view-1");
  });

  it("detaches every registered view and clears the registry", () => {
    registerComponentPreviewView("view-1");
    registerComponentPreviewView("view-2");

    detachAllComponentPreviewViews();

    expect(window.desktopBridge?.detachComponentPreview).toHaveBeenCalledTimes(2);
    expect(window.desktopBridge?.detachAllComponentPreview).toHaveBeenCalledTimes(1);
    expect(getRegisteredComponentPreviewViewIds()).toEqual([]);
  });
});
