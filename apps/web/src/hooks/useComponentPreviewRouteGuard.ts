import { useLayoutEffect } from "react";
import { useLocation, useSearch } from "@tanstack/react-router";

import { shouldDetachAllComponentPreviewsOnRoute } from "~/lib/componentPreviewRouteScope";
import { detachAllComponentPreviewViews } from "~/lib/componentPreviewViewRegistry";

/**
 * Ensures native Electron preview WebContentsViews never survive navigation to
 * non-preview pages (Home, settings, tokens, etc.).
 */
export function useComponentPreviewRouteGuard(): void {
  const pathname = useLocation({ select: (location) => location.pathname });
  const search = useSearch({ strict: false });

  useLayoutEffect(() => {
    if (
      shouldDetachAllComponentPreviewsOnRoute({
        pathname,
        search: search as Record<string, unknown>,
      })
    ) {
      detachAllComponentPreviewViews();
    }
  }, [pathname, search]);
}
