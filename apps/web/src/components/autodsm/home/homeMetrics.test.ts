import { describe, expect, it } from "vitest";

import {
  computeAdoption,
  computeHealth,
  extractActivityTag,
  formatDateHeader,
  friendlyActivityKind,
  pickSystemStatusLabel,
} from "./homeMetrics";

describe("homeMetrics", () => {
  describe("computeAdoption", () => {
    it("returns null when either input is missing", () => {
      expect(computeAdoption(null, 5)).toBeNull();
      expect(computeAdoption(10, null)).toBeNull();
    });

    it("returns 0 when there are no components", () => {
      expect(computeAdoption(0, 0)).toBe(0);
      expect(computeAdoption(0, 5)).toBe(0);
    });

    it("rounds to nearest integer percent", () => {
      expect(computeAdoption(8, 7)).toBe(88);
      expect(computeAdoption(3, 1)).toBe(33);
    });

    it("caps at 100", () => {
      expect(computeAdoption(5, 10)).toBe(100);
    });
  });

  describe("computeHealth", () => {
    it("returns null when all inputs are null", () => {
      expect(
        computeHealth({
          registryStatus: null,
          tokenCount: null,
          sidecarReady: null,
          componentCount: null,
        }),
      ).toBeNull();
    });

    it("returns 100 when everything is healthy", () => {
      expect(
        computeHealth({
          registryStatus: "ready",
          tokenCount: 50,
          sidecarReady: true,
          componentCount: 20,
        }),
      ).toBe(100);
    });

    it("partial credit for indexing registry", () => {
      const score = computeHealth({
        registryStatus: "indexing",
        tokenCount: 0,
        sidecarReady: false,
        componentCount: 0,
      });
      expect(score).toBe(15);
    });

    it("docks points for failed registry", () => {
      const score = computeHealth({
        registryStatus: "failed",
        tokenCount: 10,
        sidecarReady: true,
        componentCount: 5,
      });
      // No registry points, but tokens (25) + sidecar (20) + components (15) = 60
      expect(score).toBe(60);
    });
  });

  describe("pickSystemStatusLabel", () => {
    it("returns initializing when nothing is known", () => {
      expect(pickSystemStatusLabel({ registryStatus: null, sidecarReady: null })).toBe(
        "System initializing",
      );
    });

    it("returns healthy when registry ready and sidecar ready", () => {
      expect(pickSystemStatusLabel({ registryStatus: "ready", sidecarReady: true })).toBe(
        "System healthy",
      );
    });

    it("returns initializing while indexing", () => {
      expect(pickSystemStatusLabel({ registryStatus: "indexing", sidecarReady: false })).toBe(
        "System initializing",
      );
    });

    it("returns degraded for failed/partial/stale", () => {
      expect(pickSystemStatusLabel({ registryStatus: "failed", sidecarReady: true })).toBe(
        "System degraded",
      );
      expect(pickSystemStatusLabel({ registryStatus: "partial", sidecarReady: true })).toBe(
        "System degraded",
      );
    });
  });

  describe("formatDateHeader", () => {
    it("formats a date with weekday, month, and day", () => {
      const out = formatDateHeader(new Date("2026-05-21T12:00:00Z"));
      // Locale-dependent, but should contain at least the weekday and day number.
      expect(out.length).toBeGreaterThan(0);
      expect(out).toMatch(/\d/);
    });
  });

  describe("friendlyActivityKind", () => {
    it("maps known kinds to short labels", () => {
      expect(friendlyActivityKind("pullrequest.created")).toBe("PR");
      expect(friendlyActivityKind("component.created")).toBe("Commit");
      expect(friendlyActivityKind("component.rendered")).toBe("Render");
      expect(friendlyActivityKind("session.started")).toBe("Session");
      expect(friendlyActivityKind("token.updated")).toBe("Token");
      expect(friendlyActivityKind("changeset.applied")).toBe("Commit");
      expect(friendlyActivityKind("changeset.created")).toBe("Change");
      expect(friendlyActivityKind("release.published")).toBe("Release");
      expect(friendlyActivityKind("deprecated.tab")).toBe("Deprecate");
    });

    it("falls back to capitalised head segment for unknown kinds", () => {
      expect(friendlyActivityKind("custom.event")).toBe("Custom");
      expect(friendlyActivityKind("unknown")).toBe("Unknown");
    });
  });

  describe("extractActivityTag", () => {
    const baseEntry = {
      id: "00000000-0000-0000-0000-000000000000" as never,
      workspaceId: "ws",
      summary: "",
      createdAt: "2026-05-21T12:00:00.000Z" as never,
    };

    it("returns null for invalid JSON", () => {
      const tag = extractActivityTag({
        ...baseEntry,
        kind: "component.created",
        payloadJson: "not-json",
      });
      expect(tag).toBeNull();
    });

    it("extracts pull request number with # prefix", () => {
      const tag = extractActivityTag({
        ...baseEntry,
        kind: "pullrequest.created",
        payloadJson: JSON.stringify({ number: 143 }),
      });
      expect(tag).toBe("#143");
    });

    it("does not double-prefix # for pr numbers already prefixed", () => {
      const tag = extractActivityTag({
        ...baseEntry,
        kind: "pullrequest.created",
        payloadJson: JSON.stringify({ number: "#142" }),
      });
      expect(tag).toBe("#142");
    });

    it("extracts component name for component events", () => {
      const tag = extractActivityTag({
        ...baseEntry,
        kind: "component.created",
        payloadJson: JSON.stringify({ componentName: "PrimaryButton" }),
      });
      expect(tag).toBe("PrimaryButton");
    });

    it("extracts token id for token events", () => {
      const tag = extractActivityTag({
        ...baseEntry,
        kind: "token.updated",
        payloadJson: JSON.stringify({ tokenId: "color/primary/600" }),
      });
      expect(tag).toBe("color/primary/600");
    });

    it("returns null when payload has nothing useful", () => {
      const tag = extractActivityTag({
        ...baseEntry,
        kind: "session.started",
        payloadJson: JSON.stringify({ unrelated: true }),
      });
      expect(tag).toBeNull();
    });
  });
});
