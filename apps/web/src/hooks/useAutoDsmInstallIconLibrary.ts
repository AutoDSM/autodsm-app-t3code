import type { AutoDsmIconLibraryId } from "@t3tools/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  autodsmInstallIconLibrary,
  autodsmWorkspaceQueryKeys,
} from "~/lib/autodsmWorkspaceReactQuery";
import { useAutoDsmWorkspace } from "~/hooks/useAutoDsmWorkspace";

export function useAutoDsmInstallIconLibrary() {
  const { cwd, environmentId } = useAutoDsmWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (library: AutoDsmIconLibraryId) => {
      if (!cwd || !environmentId) {
        throw new Error("Workspace unavailable.");
      }
      return autodsmInstallIconLibrary({ environmentId, cwd, library });
    },
    onSuccess: (profile) => {
      if (!environmentId || !cwd) {
        return;
      }
      queryClient.setQueryData(autodsmWorkspaceQueryKeys.brandProfile(environmentId, cwd), profile);
    },
  });
}
