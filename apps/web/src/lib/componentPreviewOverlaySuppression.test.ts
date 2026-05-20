import { afterEach, describe, expect, it } from "vitest";

import {
  isComponentPreviewOverlaySuppressed,
  resetComponentPreviewOverlaySuppressionForTests,
  setComponentPreviewOverlaySuppressed,
} from "./componentPreviewOverlaySuppression";

describe("componentPreviewOverlaySuppression", () => {
  afterEach(() => {
    resetComponentPreviewOverlaySuppressionForTests();
  });

  it("starts unsuppressed", () => {
    expect(isComponentPreviewOverlaySuppressed()).toBe(false);
  });

  it("suppresses while an overlay reason is active", () => {
    setComponentPreviewOverlaySuppressed("model-picker", true);
    expect(isComponentPreviewOverlaySuppressed()).toBe(true);
    setComponentPreviewOverlaySuppressed("model-picker", false);
    expect(isComponentPreviewOverlaySuppressed()).toBe(false);
  });

  it("keeps suppression while any overlay reason remains active", () => {
    setComponentPreviewOverlaySuppressed("model-picker", true);
    setComponentPreviewOverlaySuppressed("command-palette", true);
    setComponentPreviewOverlaySuppressed("model-picker", false);
    expect(isComponentPreviewOverlaySuppressed()).toBe(true);
    setComponentPreviewOverlaySuppressed("command-palette", false);
    expect(isComponentPreviewOverlaySuppressed()).toBe(false);
  });
});
