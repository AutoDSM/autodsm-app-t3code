// @effect-diagnostics nodeBuiltinImport:off
// @effect-diagnostics globalDate:off
import * as fs from "node:fs/promises";
import * as path from "node:path";

import type {
  ProjectBuildComponentVariantShowcaseResult,
  ProjectVariantShowcaseExport,
} from "@t3tools/contracts";
import * as esbuild from "esbuild";

function buildShowcaseEntryContents(
  importSpecifier: string,
  exports: readonly ProjectVariantShowcaseExport[],
): string {
  const importNames = exports.map((entry, index) => {
    const alias = `Variant${index}`;
    return entry.exportName === "default"
      ? `import ${alias} from ${JSON.stringify(importSpecifier)};`
      : `import { ${entry.exportName} as ${alias} } from ${JSON.stringify(importSpecifier)};`;
  });

  const variantRows = exports
    .map((entry, index) => {
      const alias = `Variant${index}`;
      return `  { label: ${JSON.stringify(entry.label)}, Cmp: ${alias} }`;
    })
    .join(",\n");

  return [
    `import React from "react";`,
    ...importNames,
    ``,
    `const VARIANTS = [`,
    variantRows,
    `] as const;`,
    ``,
    `export default function VariantShowcase(): React.JSX.Element {`,
    `  return (`,
    `    <div`,
    `      style={{`,
    `        display: "grid",`,
    `        gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",`,
    `        gap: "16px",`,
    `        width: "100%",`,
    `        padding: "8px",`,
    `        boxSizing: "border-box",`,
    `      }}`,
    `    >`,
    `      {VARIANTS.map(({ label, Cmp }) => (`,
    `        <div`,
    `          key={label}`,
    `          style={{`,
    `            display: "flex",`,
    `            flexDirection: "column",`,
    `            alignItems: "center",`,
    `            justifyContent: "center",`,
    `            gap: "8px",`,
    `            minHeight: "96px",`,
    `          }}`,
    `        >`,
    `          <span style={{ fontSize: "11px", opacity: 0.72, textAlign: "center" }}>{label}</span>`,
    `          <Cmp />`,
    `        </div>`,
    `      ))}`,
    `    </div>`,
    `  );`,
    `}`,
    ``,
  ].join("\n");
}

export async function bundleComponentVariantShowcase(input: {
  readonly cwd: string;
  readonly absoluteComponentPath: string;
  readonly relativePathPosix: string;
  readonly exports: readonly ProjectVariantShowcaseExport[];
}): Promise<ProjectBuildComponentVariantShowcaseResult> {
  const warnings: string[] = [];
  const errors: string[] = [];

  const relFromCwd = path
    .relative(input.cwd, input.absoluteComponentPath)
    .split(path.sep)
    .join("/");
  const importSpecifier = relFromCwd.startsWith(".") ? relFromCwd : `./${relFromCwd}`;
  const entryContents = buildShowcaseEntryContents(importSpecifier, input.exports);

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
        sourcefile: "t3-component-variant-showcase-entry.tsx",
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
    });

    const durationMs = Date.now() - startedAtMs;
    const moduleCount = result.metafile ? Object.keys(result.metafile.inputs).length : 0;

    for (const msg of result.warnings) {
      warnings.push(msg.text);
    }

    const file = result.outputFiles?.[0];
    if (!file || file.text.length === 0) {
      errors.push(
        `esbuild produced empty variant showcase output for ${input.relativePathPosix} (bundled ${moduleCount} modules in ${durationMs}ms).`,
      );
      return { ok: false, warnings, errors };
    }

    warnings.push(
      `Bundled variant showcase (${input.exports.length} exports, ${moduleCount} modules) in ${durationMs}ms.`,
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
