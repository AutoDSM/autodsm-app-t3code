"use client";

import { useEffect } from "react";

import {
  setComponentPreviewOverlaySuppressed,
  type ComponentPreviewOverlaySuppressionReason,
} from "~/lib/componentPreviewOverlaySuppression";

/**
 * Keeps the native Electron component preview suppressed while transient UI overlays
 * (modals, pickers, sheets) are open.
 */
export function useComponentPreviewOverlaySuppression(
  open: boolean,
  reason: ComponentPreviewOverlaySuppressionReason,
): void {
  useEffect(() => {
    if (!open) {
      return;
    }
    setComponentPreviewOverlaySuppressed(reason, true);
    return () => {
      setComponentPreviewOverlaySuppressed(reason, false);
    };
  }, [open, reason]);
}
