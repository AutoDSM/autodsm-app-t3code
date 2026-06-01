// @effect-diagnostics nodeBuiltinImport:off
// @effect-diagnostics globalDate:off
import * as fs from "node:fs/promises";
import * as path from "node:path";

import type {
  ProjectBuildComponentPropVariantShowcaseResult,
  ProjectPropVariantCell,
} from "@t3tools/contracts";
import * as esbuild from "esbuild";

import { previewReactExternalPlugin } from "./bundleComponentPreview.ts";

/**
 * Builds the entry module for a prop-based variant showcase: the SAME export
 * rendered once per cell with that cell's props, grouped under a heading per
 * section (the prop being varied). Mirrors `bundleComponentVariantShowcase`
 * but varies props instead of importing distinct exports.
 */
function buildPropShowcaseEntryContents(
  importSpecifier: string,
  exportName: string,
  cells: readonly ProjectPropVariantCell[],
): string {
  const importLine =
    exportName === "default"
      ? `import Cmp from ${JSON.stringify(importSpecifier)};`
      : `import { ${exportName} as Cmp } from ${JSON.stringify(importSpecifier)};`;

  // Embed cells as data (props pre-parsed at build time and re-serialized so the
  // bundle carries plain literals — no runtime JSON.parse of untrusted strings).
  const cellData = cells.map((cell) => ({
    section: cell.section,
    label: cell.label,
    props: safeParseProps(cell.propsJson),
  }));

  return [
    `import React from "react";`,
    importLine,
    ``,
    `const CELLS = ${JSON.stringify(cellData)};`,
    ``,
    `function groupBySection(cells) {`,
    `  const order = [];`,
    `  const map = new Map();`,
    `  for (const cell of cells) {`,
    `    if (!map.has(cell.section)) {`,
    `      map.set(cell.section, []);`,
    `      order.push(cell.section);`,
    `    }`,
    `    map.get(cell.section).push(cell);`,
    `  }`,
    `  return order.map((section) => ({ section, cells: map.get(section) }));`,
    `}`,
    ``,
    `export default function PropVariantShowcase(): React.JSX.Element {`,
    `  const sections = groupBySection(CELLS);`,
    `  return (`,
    `    <div style={{ display: "flex", flexDirection: "column", gap: "24px", width: "100%", padding: "8px", boxSizing: "border-box" }}>`,
    `      {sections.map(({ section, cells }) => (`,
    `        <section key={section} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>`,
    `          <h3 style={{ margin: 0, fontSize: "12px", fontWeight: 600, textTransform: "capitalize", opacity: 0.72 }}>{section}</h3>`,
    `          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "16px" }}>`,
    `            {cells.map((cell, index) => (`,
    `              <div key={cell.label + ":" + index} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px", minHeight: "96px" }}>`,
    `                <span style={{ fontSize: "11px", opacity: 0.72, textAlign: "center" }}>{cell.label}</span>`,
    `                <Cmp {...cell.props} />`,
    `              </div>`,
    `            ))}`,
    `          </div>`,
    `        </section>`,
    `      ))}`,
    `    </div>`,
    `  );`,
    `}`,
    ``,
  ].join("\n");
}

function safeParseProps(propsJson: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(propsJson) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export async function bundleComponentPropVariantShowcase(input: {
  readonly cwd: string;
  readonly absoluteComponentPath: string;
  readonly relativePathPosix: string;
  readonly exportName: string;
  readonly cells: readonly ProjectPropVariantCell[];
}): Promise<ProjectBuildComponentPropVariantShowcaseResult> {
  const warnings: string[] = [];
  const errors: string[] = [];

  const relFromCwd = path
    .relative(input.cwd, input.absoluteComponentPath)
    .split(path.sep)
    .join("/");
  const importSpecifier = relFromCwd.startsWith(".") ? relFromCwd : `./${relFromCwd}`;
  const entryContents = buildPropShowcaseEntryContents(
    importSpecifier,
    input.exportName,
    input.cells,
  );

  const tsconfigPath = path.join(input.cwd, "tsconfig.json");
  let tsconfig: string | undefined;
  try {
    await fs.access(tsconfigPath);
    tsconfig = tsconfigPath;
  } catch {
    tsconfig = undefined;
  }

  const startedAtMs = Date.now();
  try {
    const result = await esbuild.build({
      stdin: {
        contents: entryContents,
        loader: "tsx",
        resolveDir: input.cwd,
        sourcefile: "t3-component-prop-variant-showcase-entry.tsx",
      },
      bundle: true,
      write: false,
      format: "esm",
      platform: "browser",
      jsx: "automatic",
      jsxImportSource: "react",
      target: "es2022",
      logLevel: "silent",
      ...(tsconfig !== undefined ? { tsconfig } : {}),
      loader: {
        ".tsx": "tsx",
        ".ts": "ts",
        ".jsx": "jsx",
        ".js": "js",
        ".css": "empty",
        ".scss": "empty",
        ".sass": "empty",
        ".less": "empty",
      },
      sourcemap: false,
      metafile: true,
      plugins: [previewReactExternalPlugin],
    });

    const durationMs = Date.now() - startedAtMs;
    const moduleCount = result.metafile ? Object.keys(result.metafile.inputs).length : 0;

    for (const msg of result.warnings) {
      warnings.push(msg.text);
    }

    const file = result.outputFiles?.[0];
    if (!file || file.text.length === 0) {
      errors.push(
        `esbuild produced empty prop-variant showcase output for ${input.relativePathPosix} (bundled ${moduleCount} modules in ${durationMs}ms).`,
      );
      return { ok: false, warnings, errors };
    }

    warnings.push(
      `Bundled prop-variant showcase (${input.cells.length} cells, ${moduleCount} modules) in ${durationMs}ms.`,
    );

    return {
      ok: true,
      javascript: file.text,
      warnings,
      errors,
    };
  } catch (unknownError: unknown) {
    const durationMs = Date.now() - startedAtMs;
    const msg = unknownError instanceof Error ? unknownError.message : String(unknownError);
    errors.push(`${msg} (failed after ${durationMs}ms)`);
    return { ok: false, warnings, errors };
  }
}
