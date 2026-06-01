import type {
  ComponentPreviewManifest,
  ComponentPreviewPropSpec,
  ProjectPropVariantCell,
} from "@t3tools/contracts";

import { buildDefaultProps, propsForExport, sortPropSpecsForPanel } from "./componentPreviewProps";

export {
  hasMultipleVariants,
  isRenderableExport,
  listVariantExportCells,
  listVariantExports,
  resolvePrimaryExport,
  resolvePrimaryExportName,
  stripStarterPrefixFromExport,
  variantLabel,
  type VariantExportCell,
} from "@t3tools/shared/componentVariantFamily";

/** Discrete values a prop can take to form variant cells, or null when it isn't enumerable. */
function variantValuesForProp(spec: ComponentPreviewPropSpec): readonly unknown[] | null {
  if (spec.kind === "enum" || spec.kind === "literalUnion") {
    const values = spec.enumValues ?? [];
    // Only enumerate when there's a real choice to show.
    return values.length >= 2 ? values : null;
  }
  if (spec.kind === "boolean") {
    return [false, true];
  }
  return null;
}

/**
 * Enumerate prop-based variant cells: for each enum/boolean prop with a real
 * choice, emit one cell per value with the other props held at their defaults
 * (merged over `baseProps` so non-varied props match the Demo tab). Grouped by
 * section = the prop name; sections ordered with `variant` first.
 */
export function listPropVariantCells(
  manifest: ComponentPreviewManifest,
  exportName: string,
  baseProps: Record<string, unknown> = {},
): readonly ProjectPropVariantCell[] {
  const specs = sortPropSpecsForPanel(propsForExport(manifest, exportName));
  const base: Record<string, unknown> = { ...buildDefaultProps(specs), ...baseProps };

  const cells: ProjectPropVariantCell[] = [];
  for (const spec of specs) {
    const values = variantValuesForProp(spec);
    if (!values) {
      continue;
    }
    for (const value of values) {
      cells.push({
        section: spec.name,
        label: String(value),
        propsJson: JSON.stringify({ ...base, [spec.name]: value }),
      });
    }
  }
  return cells;
}

/** True when the export exposes at least one enumerable (enum/boolean) variant prop. */
export function hasPropVariants(manifest: ComponentPreviewManifest, exportName: string): boolean {
  return propsForExport(manifest, exportName).some((spec) => variantValuesForProp(spec) !== null);
}
