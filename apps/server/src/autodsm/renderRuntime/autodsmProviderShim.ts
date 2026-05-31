// @effect-diagnostics nodeBuiltinImport:off
import type { AutoDsmWorkspaceStarterId } from "@t3tools/contracts";

/**
 * Per-starter provider shim source.
 *
 * AutoDSM's preview-runtime convention is to wrap each rendered component in a
 * starter-specific PreviewShell module that ships inside the template (see e.g.
 * `apps/server/workspace-templates/mui/src/preview/MuiPreviewShell.tsx`). Each
 * shell mounts the right provider stack (ThemeProvider, ChakraProvider, etc.)
 * around its children, and individual component files import it directly.
 *
 * This module is the single source of truth for which shell path applies to a
 * given starter. The Vite sidecar and any future SSR fallback should call
 * `resolveProviderShellImport(starterId)` to know which module to import when
 * building a wrapper around scanner-discovered components that did not bring
 * their own PreviewShell wrapper.
 */
export interface ProviderShellImport {
  /** Workspace-relative path to the shell module (no leading slash). */
  readonly relativePath: string;
  /** Exported symbol name (always the default React component). */
  readonly exportName: string;
}

const SHELL_BY_STARTER: Record<AutoDsmWorkspaceStarterId, ProviderShellImport | null> = {
  "shadcn-ui": null, // Shadcn templates use CSS variables on :root; no extra shell.
  "tailwind-css": null,
  "modern-starter": null,
  mui: { relativePath: "src/preview/MuiPreviewShell.tsx", exportName: "MuiPreviewShell" },
  "chakra-ui": {
    relativePath: "src/preview/ChakraPreviewShell.tsx",
    exportName: "ChakraPreviewShell",
  },
};

export function resolveProviderShellImport(
  starterId: AutoDsmWorkspaceStarterId,
): ProviderShellImport | null {
  return SHELL_BY_STARTER[starterId] ?? null;
}

/**
 * Render a TSX wrapper source for a component file. Used by code-paths that
 * dynamically generate a preview entry point (Vite virtual modules, etc.). The
 * generated source uses ESM imports against the workspace root.
 *
 * Example output for `starterId: "mui"`:
 *   import { MuiPreviewShell } from "/src/preview/MuiPreviewShell.tsx";
 *   import Component from "/src/components/MuiButton.tsx";
 *   export default function PreviewEntry(): JSX.Element {
 *     return <MuiPreviewShell><Component /></MuiPreviewShell>;
 *   }
 */
export function composeProviderShimSource(input: {
  readonly starterId: AutoDsmWorkspaceStarterId;
  readonly componentImportPath: string;
  readonly componentExportName?: string;
}): string {
  const shell = resolveProviderShellImport(input.starterId);
  const componentImport =
    input.componentExportName && input.componentExportName !== "default"
      ? `import { ${input.componentExportName} as Component } from "${input.componentImportPath}";`
      : `import Component from "${input.componentImportPath}";`;
  if (shell === null) {
    return `${componentImport}
export default function PreviewEntry() {
  return <Component />;
}
`;
  }
  return `import { ${shell.exportName} } from "/${shell.relativePath}";
${componentImport}
export default function PreviewEntry() {
  return <${shell.exportName}><Component /></${shell.exportName}>;
}
`;
}
