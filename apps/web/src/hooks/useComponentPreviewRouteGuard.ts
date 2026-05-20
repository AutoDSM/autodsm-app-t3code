import { useLayoutEffect } from "react";
import { useLocation, useSearch } from "@tanstack/react-router";

import { parseDiffRouteSearch } from "~/diffRouteSearch";
import { shouldDetachAllComponentPreviewsOnRoute } from "~/lib/componentPreviewRouteScope";
import {
  detachAllComponentPreviewViews,
  sweepStaleNativeComponentPreviewViews,
} from "~/lib/componentPreviewViewRegistry";

/**
 * Ensures native Electron preview WebContentsViews never survive navigation to
 * non-preview pages (Home, settings, tokens, etc.).
 */
export function useComponentPreviewRouteGuard(): void {
  const pathname = useLocation({ select: (location) => location.pathname });
  const componentPath = useSearch({
    strict: false,
    select: (search) =>
      parseDiffRouteSearch(search as Record<string, unknown>).componentPath ?? null,
  });

  useLayoutEffect(() => {
    sweepStaleNativeComponentPreviewViews();
  }, []);

  useLayoutEffect(() => {
    if (
      shouldDetachAllComponentPreviewsOnRoute({
        pathname,
        search: componentPath ? { componentPath } : {},
      })
    ) {
      detachAllComponentPreviewViews();
    }
  }, [componentPath, pathname]);
}
