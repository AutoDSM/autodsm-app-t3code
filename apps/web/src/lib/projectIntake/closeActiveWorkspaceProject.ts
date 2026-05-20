import { useUiStateStore } from "~/uiStateStore";

/** Route that shows create-project and open-existing options when no workspace is active. */
export const AUTO_DSM_PROJECT_PICKER_PATH = "/" as const;

export function shouldShowAutoDsmProjectPicker(input: {
  readonly onboardingCompleted: boolean;
  readonly hasDesignSystemOnDisk: boolean;
}): boolean {
  return input.onboardingCompleted && !input.hasDesignSystemOnDisk;
}

export function closeActiveWorkspaceProject(): void {
  useUiStateStore.getState().setAutoDsmWorkspaceProjectRef(null);
}
