"use client";

import type { JSX } from "react";

import watermarkForDarkUi from "~/assets/autodsm/watermark-dark.png";
import watermarkForLightUi from "~/assets/autodsm/watermark-default.png";
import { useTheme } from "~/hooks/useTheme";
import { cn } from "~/lib/utils";

/**
 * AutoDSM cube watermark for loading and splash surfaces.
 * Gray mark on light UI; white mark on dark UI (matches Figma Dark Mode / Default exports).
 */
export function AutoDsmWatermark(props: { readonly className?: string }): JSX.Element {
  const { className } = props;
  const { resolvedTheme } = useTheme();
  const src = resolvedTheme === "dark" ? watermarkForDarkUi : watermarkForLightUi;

  return <img alt="" aria-hidden className={cn("size-16 object-contain", className)} src={src} />;
}
