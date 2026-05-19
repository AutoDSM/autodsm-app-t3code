import type { EnvironmentId } from "@t3tools/contracts";
import type { QueryClient } from "@tanstack/react-query";

import { autodsmWorkspaceQueryKeys } from "~/lib/autodsmWorkspaceReactQuery";

export function invalidateComponentPreviewQueries(
  queryClient: QueryClient,
  input: {
    readonly environmentId: EnvironmentId | null;
    readonly projectCwd: string | null;
  },
): void {
  void queryClient.invalidateQueries({
    queryKey: ["component-preview-manifest"],
  });
  void queryClient.invalidateQueries({
    queryKey: ["component-preview-bundle"],
  });
  void queryClient.invalidateQueries({
    queryKey: ["component-preview-execute-render-plan"],
  });

  if (input.environmentId && input.projectCwd) {
    void queryClient.invalidateQueries({
      queryKey: autodsmWorkspaceQueryKeys.componentRegistry(input.environmentId, input.projectCwd),
    });
  }
}
