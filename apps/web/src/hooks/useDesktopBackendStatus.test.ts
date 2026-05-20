import type { DesktopBackendStatus } from "@t3tools/contracts";
import { afterEach, describe, expect, it } from "vitest";

import { subscribeDesktopBackendStatus } from "./useDesktopBackendStatus";

const originalWindow = globalThis.window;

afterEach(() => {
  if (originalWindow === undefined) {
    Reflect.deleteProperty(globalThis, "window");
    return;
  }

  globalThis.window = originalWindow;
});

describe("subscribeDesktopBackendStatus", () => {
  it("forwards backend status events from the desktop bridge", () => {
    const received: DesktopBackendStatus[] = [];

    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        desktopBridge: {
          onBackendStatus: (listener: (status: DesktopBackendStatus) => void) => {
            listener({
              kind: "fatal",
              reason: "code=1",
              attempts: 3,
              logDir: "/tmp/t3/dev/logs",
            });
            return () => undefined;
          },
        },
      },
    });

    subscribeDesktopBackendStatus((status) => {
      received.push(status);
    });

    expect(received).toEqual([
      {
        kind: "fatal",
        reason: "code=1",
        attempts: 3,
        logDir: "/tmp/t3/dev/logs",
      },
    ]);
  });

  it("returns undefined when the desktop bridge is unavailable", () => {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {},
    });

    expect(subscribeDesktopBackendStatus(() => undefined)).toBeUndefined();
  });
});
