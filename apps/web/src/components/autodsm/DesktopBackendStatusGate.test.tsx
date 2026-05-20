import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { DesktopBackendStatusGate } from "./DesktopBackendStatusGate";

vi.mock("~/env", () => ({
  isElectron: true,
}));

const backendStatusState = vi.hoisted(() => ({
  status: null as {
    kind: string;
    attempt?: number;
    reason?: string;
    attempts?: number;
    logDir?: string;
  } | null,
}));

vi.mock("~/hooks/useDesktopBackendStatus", () => ({
  useDesktopBackendStatus: () => backendStatusState.status,
}));

describe("DesktopBackendStatusGate", () => {
  it("keeps children mounted while backend is restarting", () => {
    backendStatusState.status = { kind: "restarting", attempt: 2 };

    const html = renderToStaticMarkup(
      <DesktopBackendStatusGate>
        <div data-testid="app-content">Onboarding</div>
      </DesktopBackendStatusGate>,
    );

    expect(html).toContain("Onboarding");
    expect(html).toContain("Reconnecting to workspace");
    expect(html).toContain("Attempt 2 of 4");
  });

  it("replaces the tree when backend is fatal", () => {
    backendStatusState.status = {
      kind: "fatal",
      reason: "backend exited",
      attempts: 3,
      logDir: "/tmp/logs",
    };

    const html = renderToStaticMarkup(
      <DesktopBackendStatusGate>
        <div data-testid="app-content">Onboarding</div>
      </DesktopBackendStatusGate>,
    );

    expect(html).not.toContain("Onboarding");
    expect(html).toContain("Backend crashed and could not recover");
  });
});
