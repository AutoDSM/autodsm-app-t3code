"use client";

import type { ComponentPreviewManifest, ComponentPreviewPropSpec, EnvironmentId } from "@t3tools/contracts";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { ensureEnvironmentApi } from "~/environmentApi";
import { resolvePrimaryExport } from "~/lib/autoDsmComponentVariantFamily";
import { buildDefaultProps, propsForExport } from "~/lib/componentPreviewProps";

export interface UseAutoDsmComponentPreviewStateInput {
  readonly relativePath: string | null;
  readonly environmentId: EnvironmentId;
  readonly workspaceCwd: string | null;
}

export interface AutoDsmComponentPreviewState {
  readonly manifest: ComponentPreviewManifest | undefined;
  readonly primaryExportName: string;
  readonly propSpecs: readonly ComponentPreviewPropSpec[];
  readonly controlledProps: Record<string, unknown>;
  readonly setControlledProps: (next: Record<string, unknown>) => void;
}

/**
 * Owns the component-preview manifest analysis and the controlled prop values so
 * the preview (canvas) and the Props panel (right-column tab) can share one
 * source of truth. Previously lived inside `AutoDsmComponentPreviewCanvas`.
 */
export function useAutoDsmComponentPreviewState(
  input: UseAutoDsmComponentPreviewStateInput,
): AutoDsmComponentPreviewState {
  const { relativePath, environmentId, workspaceCwd } = input;
  const [controlledProps, setControlledProps] = useState<Record<string, unknown>>({});

  const analyzeEnabled = Boolean(relativePath?.trim() && workspaceCwd && environmentId);

  const manifestQuery = useQuery({
    queryKey: ["component-preview-analyze", environmentId, workspaceCwd, relativePath],
    enabled: analyzeEnabled,
    staleTime: 0,
    queryFn: async () => {
      const api = ensureEnvironmentApi(environmentId);
      const result = await api.projects.analyzeReactComponent({
        cwd: workspaceCwd!,
        relativePath: relativePath!,
      });
      return result.manifest;
    },
  });

  const manifest: ComponentPreviewManifest | undefined = manifestQuery.data;
  const primaryExportName = useMemo(
    () => (manifest && relativePath ? resolvePrimaryExport(manifest, relativePath) : "default"),
    [manifest, relativePath],
  );

  const propSpecs = useMemo(
    () => (manifest ? propsForExport(manifest, primaryExportName) : []),
    [manifest, primaryExportName],
  );

  useEffect(() => {
    if (!manifest) {
      return;
    }
    setControlledProps(buildDefaultProps(propsForExport(manifest, primaryExportName)));
  }, [manifest, primaryExportName, relativePath]);

  return { manifest, primaryExportName, propSpecs, controlledProps, setControlledProps };
}
