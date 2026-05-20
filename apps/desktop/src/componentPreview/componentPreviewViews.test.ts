import { beforeEach, describe, expect, it, vi } from "vitest";

type MockWebContents = {
  close: ReturnType<typeof vi.fn>;
  removeAllListeners: ReturnType<typeof vi.fn>;
  isDestroyed: ReturnType<typeof vi.fn>;
  isLoading: ReturnType<typeof vi.fn>;
  getURL: ReturnType<typeof vi.fn>;
  once: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  setWindowOpenHandler: ReturnType<typeof vi.fn>;
  loadURL: ReturnType<typeof vi.fn>;
};

type MockView = {
  setBounds: ReturnType<typeof vi.fn>;
  webContents: MockWebContents;
};

function createMockWebContents(): MockWebContents {
  return {
    close: vi.fn(),
    removeAllListeners: vi.fn(),
    isDestroyed: vi.fn(() => false),
    isLoading: vi.fn(() => false),
    getURL: vi.fn(() => "http://127.0.0.1/preview"),
    once: vi.fn(),
    on: vi.fn(),
    setWindowOpenHandler: vi.fn(),
    loadURL: vi.fn(),
  };
}

function createMockWindow(destroyed = false) {
  const childViews: MockView[] = [];
  return {
    isDestroyed: () => destroyed,
    contentView: {
      addChildView: vi.fn((view: MockView) => {
        childViews.push(view);
      }),
      removeChildView: vi.fn((view: MockView) => {
        const index = childViews.indexOf(view);
        if (index >= 0) {
          childViews.splice(index, 1);
        }
      }),
    },
    webContents: {
      send: vi.fn(),
    },
    getContentBounds: () => ({ x: 0, y: 0, width: 1200, height: 800 }),
    childViews,
  };
}

const createdViews: MockView[] = [];

vi.mock("electron", () => {
  class MockWebContentsView {
    setBounds = vi.fn();
    webContents = createMockWebContents();

    constructor() {
      createdViews.push(this as unknown as MockView);
    }
  }

  return {
    WebContentsView: MockWebContentsView,
    session: {
      fromPartition: () => ({
        setPermissionRequestHandler: vi.fn(),
      }),
    },
  };
});

import {
  attachPreviewView,
  clampPreviewBounds,
  detachAllPreviewViews,
  detachPreviewView,
  resetPreviewRegistryForTests,
  sweepPreviewViewsForWindow,
} from "./componentPreviewViews.ts";

describe("componentPreviewViews lifecycle", () => {
  beforeEach(() => {
    resetPreviewRegistryForTests();
    createdViews.length = 0;
  });

  it("detaches using the registered owner window", async () => {
    const owner = createMockWindow();
    const other = createMockWindow();

    await attachPreviewView({
      browserWindow: owner as never,
      viewId: "view-1",
      url: "http://127.0.0.1/preview",
      bounds: { x: 0, y: 0, width: 100, height: 100 },
    });

    detachPreviewView("view-1");

    expect(owner.contentView.removeChildView).toHaveBeenCalled();
    expect(other.contentView.removeChildView).not.toHaveBeenCalled();
    expect(createdViews[0]?.webContents.close).toHaveBeenCalled();
  });

  it("sweeps previews owned by a closing window", async () => {
    const first = createMockWindow();
    const second = createMockWindow();

    await attachPreviewView({
      browserWindow: first as never,
      viewId: "view-1",
      url: "http://127.0.0.1/preview",
      bounds: { x: 0, y: 0, width: 100, height: 100 },
    });
    await attachPreviewView({
      browserWindow: second as never,
      viewId: "view-2",
      url: "http://127.0.0.1/preview",
      bounds: { x: 0, y: 0, width: 100, height: 100 },
    });

    sweepPreviewViewsForWindow(first as never);

    expect(first.contentView.removeChildView).toHaveBeenCalled();
    expect(second.contentView.removeChildView).not.toHaveBeenCalled();
  });

  it("clears every preview on detachAllPreviewViews", async () => {
    const first = createMockWindow();
    const second = createMockWindow();

    await attachPreviewView({
      browserWindow: first as never,
      viewId: "view-1",
      url: "http://127.0.0.1/preview",
      bounds: { x: 0, y: 0, width: 100, height: 100 },
    });
    await attachPreviewView({
      browserWindow: second as never,
      viewId: "view-2",
      url: "http://127.0.0.1/preview",
      bounds: { x: 0, y: 0, width: 100, height: 100 },
    });

    detachAllPreviewViews();

    expect(first.contentView.removeChildView).toHaveBeenCalled();
    expect(second.contentView.removeChildView).toHaveBeenCalled();
  });

  it("allows idempotent detach calls for the same view id", async () => {
    const owner = createMockWindow();

    await attachPreviewView({
      browserWindow: owner as never,
      viewId: "view-1",
      url: "http://127.0.0.1/preview",
      bounds: { x: 0, y: 0, width: 100, height: 100 },
    });

    detachPreviewView("view-1");
    detachPreviewView("view-1");

    expect(owner.contentView.removeChildView).toHaveBeenCalledTimes(1);
    expect(createdViews[0]?.webContents.close).toHaveBeenCalledTimes(1);
  });
});

describe("clampPreviewBounds", () => {
  const content = { width: 1200, height: 800 };

  it("passes through valid bounds unchanged", () => {
    expect(clampPreviewBounds({ x: 10, y: 20, width: 400, height: 300 }, content)).toEqual({
      x: 10,
      y: 20,
      width: 400,
      height: 300,
    });
  });

  it("clamps negative origin to zero", () => {
    expect(clampPreviewBounds({ x: -50, y: -10, width: 200, height: 100 }, content)).toEqual({
      x: 0,
      y: 0,
      width: 200,
      height: 100,
    });
  });
});
