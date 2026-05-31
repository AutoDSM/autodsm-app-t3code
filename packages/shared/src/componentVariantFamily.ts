import type {
  ComponentPreviewExportKind,
  ComponentPreviewExportSpec,
  ComponentPreviewManifest,
} from "@t3tools/contracts";

const RENDERABLE_EXPORT_KINDS: ReadonlySet<ComponentPreviewExportKind> = new Set([
  "function",
  "forwardRef",
  "memo",
  "class",
]);

export function isRenderableExport(exportSpec: ComponentPreviewExportSpec): boolean {
  return exportSpec.name !== "default" && RENDERABLE_EXPORT_KINDS.has(exportSpec.kind);
}

export function fileStemFromComponentPath(componentPath: string): string {
  const normalized = componentPath.replace(/\\/g, "/");
  const fileName = normalized.split("/").pop() ?? normalized;
  return fileName.replace(/\.(tsx|jsx)$/i, "");
}

function compareExportNames(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

export function resolvePrimaryExportName(
  exports: readonly ComponentPreviewExportSpec[],
  componentPath: string,
): string {
  const renderable = exports.filter(isRenderableExport);
  if (renderable.length === 0) {
    const def = exports.find((ex) => ex.isDefault);
    if (def) return "default";
    const first = exports.find((ex) => ex.name !== "default");
    return first?.name ?? "default";
  }

  const stem = fileStemFromComponentPath(componentPath);
  const stemMatch = renderable.find((ex) => ex.name === stem);
  if (stemMatch) {
    return stemMatch.name;
  }

  return renderable[0]!.name;
}

export function resolvePrimaryExport(
  manifest: ComponentPreviewManifest,
  componentPath?: string,
): string {
  return resolvePrimaryExportName(manifest.exports, componentPath ?? manifest.relativePath);
}

export function listVariantExports(manifest: ComponentPreviewManifest): readonly string[] {
  const primary = resolvePrimaryExport(manifest);
  const renderable = manifest.exports.filter(isRenderableExport).map((ex) => ex.name);
  const rest = renderable.filter((name) => name !== primary).toSorted(compareExportNames);
  return primary === "default" || !renderable.includes(primary)
    ? renderable.toSorted(compareExportNames)
    : [primary, ...rest];
}

export function hasMultipleVariants(manifest: ComponentPreviewManifest): boolean {
  return listVariantExports(manifest).length > 1;
}

function titleCaseFromIdentifier(identifier: string): string {
  const spaced = identifier
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .trim();
  return spaced.length === 0 ? identifier : spaced;
}

export function stripStarterPrefixFromExport(
  exportName: string,
  starterPrefixes: readonly string[] = [],
): string {
  for (const prefix of starterPrefixes) {
    if (exportName.length > prefix.length && exportName.startsWith(prefix)) {
      const rest = exportName.slice(prefix.length);
      if (rest[0] && rest[0] >= "A" && rest[0] <= "Z") {
        return rest;
      }
    }
  }
  return exportName;
}

export function variantLabel(
  exportName: string,
  primaryExportName: string,
  starterPrefixes: readonly string[] = [],
): string {
  if (exportName === primaryExportName) {
    return "Default";
  }
  const strippedPrimary = stripStarterPrefixFromExport(primaryExportName, starterPrefixes);
  const strippedExport = stripStarterPrefixFromExport(exportName, starterPrefixes);
  if (
    strippedExport.startsWith(strippedPrimary) &&
    strippedExport.length > strippedPrimary.length
  ) {
    const suffix = strippedExport.slice(strippedPrimary.length);
    const label = titleCaseFromIdentifier(suffix);
    return label.length > 0 ? label : strippedExport;
  }
  return titleCaseFromIdentifier(strippedExport);
}

export interface VariantExportCell {
  readonly exportName: string;
  readonly label: string;
}

export function listVariantExportCells(
  manifest: ComponentPreviewManifest,
  starterPrefixes: readonly string[] = [],
): readonly VariantExportCell[] {
  const primary = resolvePrimaryExport(manifest);
  return listVariantExports(manifest).map((exportName) => ({
    exportName,
    label: variantLabel(exportName, primary, starterPrefixes),
  }));
}
