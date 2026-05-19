import type { SrcComponentsCatalogViewModel } from "~/lib/srcComponentsCatalog";
import { DEFAULT_SRC_COMPONENTS_FOLDER_LABEL } from "~/lib/srcComponentsCatalog";

/** Fixture path must pass `isWorkspaceSrcComponentsUiRelativePath` for URL/search parity. */
export const SANDBOX_COMPONENT_RELATIVE_PATH = "src/components/Sandbox/Button.tsx";

export function sandboxSrcComponentsCatalogViewModel(): SrcComponentsCatalogViewModel {
  return {
    folderLabel: DEFAULT_SRC_COMPONENTS_FOLDER_LABEL,
    paths: [SANDBOX_COMPONENT_RELATIVE_PATH],
    isPending: false,
    isError: false,
    truncated: false,
    gate: null,
  };
}
