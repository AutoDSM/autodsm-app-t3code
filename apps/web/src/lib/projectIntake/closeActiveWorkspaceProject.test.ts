import { describe, expect, it } from "vitest";

import {
  closeActiveWorkspaceProject,
  shouldShowAutoDsmProjectPicker,
} from "~/lib/projectIntake/closeActiveWorkspaceProject";
import { useUiStateStore } from "~/uiStateStore";
import { EnvironmentId, ProjectId } from "@t3tools/contracts";

describe("shouldShowAutoDsmProjectPicker", () => {
  it("is true when onboarding is complete and no design system exists on disk", () => {
    expect(
      shouldShowAutoDsmProjectPicker({
        onboardingCompleted: true,
        hasDesignSystemOnDisk: false,
      }),
    ).toBe(true);
  });

  it("is false when a design system already exists on disk", () => {
    expect(
      shouldShowAutoDsmProjectPicker({
        onboardingCompleted: true,
        hasDesignSystemOnDisk: true,
      }),
    ).toBe(false);
  });

  it("is false when onboarding is incomplete", () => {
    expect(
      shouldShowAutoDsmProjectPicker({
        onboardingCompleted: false,
        hasDesignSystemOnDisk: false,
      }),
    ).toBe(false);
  });
});

describe("closeActiveWorkspaceProject", () => {
  it("clears the active workspace project ref", () => {
    useUiStateStore.setState({
      autoDsmWorkspaceProjectRef: {
        environmentId: "env-1" as EnvironmentId,
        projectId: "proj-1" as ProjectId,
      },
    });

    closeActiveWorkspaceProject();

    expect(useUiStateStore.getState().autoDsmWorkspaceProjectRef).toBeNull();
  });
});
