import type { EnvironmentId } from "@t3tools/contracts";
import type { QueryClient } from "@tanstack/react-query";

import { autodsmWorkspaceQueryKeys } from "~/lib/autodsmWorkspaceReactQuery";
import { normalizeSidebarComponentCatalogPath } from "~/lib/srcComponentsWorkspacePaths";

export function invalidateComponentPreviewQueries(
  queryClient: QueryClient,
  input: {
    readonly environmentId: EnvironmentId | null;
    readonly projectCwd: string | null;
    readonly relativePath?: string | null;
  },
): void {
  const normalizedPath =
    input.relativePath === undefined || input.relativePath === null
      ? null
      : normalizeSidebarComponentCatalogPath(input.relativePath);

  if (normalizedPath && input.environmentId && input.projectCwd) {
    void queryClient.invalidateQueries({
      queryKey: [
        "component-preview-manifest",
        input.environmentId,
        input.projectCwd,
        normalizedPath,
      ],
    });
    void queryClient.invalidateQueries({
      queryKey: ["component-preview-bundle", input.environmentId, input.projectCwd, normalizedPath],
    });
    void queryClient.invalidateQueries({
      queryKey: ["component-preview-execute-render-plan", input.environmentId, input.projectCwd],
    });
    return;
  }

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
