// @effect-diagnostics nodeBuiltinImport:off
import * as fs from "node:fs/promises";
import * as path from "node:path";

import type { ProjectBuildComponentPreviewResult } from "@t3tools/contracts";
import * as esbuild from "esbuild";

export async function bundleComponentPreview(input: {
  readonly cwd: string;
  readonly absoluteComponentPath: string;
  readonly relativePathPosix: string;
  readonly exportName: string;
}): Promise<ProjectBuildComponentPreviewResult> {
  const warnings: string[] = [];
  const errors: string[] = [];

  const relFromCwd = path
    .relative(input.cwd, input.absoluteComponentPath)
    .split(path.sep)
    .join("/");
  const importSpecifier = relFromCwd.startsWith(".") ? relFromCwd : `./${relFromCwd}`;

  const entryContents =
    input.exportName === "default"
      ? `import Cmp from ${JSON.stringify(importSpecifier)};\nexport default Cmp;\n`
      : `import { ${input.exportName} as Cmp } from ${JSON.stringify(importSpecifier)};\nexport default Cmp;\n`;

  const tsconfigPath = path.join(input.cwd, "tsconfig.json");
  let tsconfig: string | undefined;
  try {
    await fs.access(tsconfigPath);
    tsconfig = tsconfigPath;
  } catch {
    tsconfig = undefined;
  }

  try {
    const result = await esbuild.build({
      stdin: {
        contents: entryContents,
        loader: "tsx",
        resolveDir: input.cwd,
        sourcefile: "t3-component-preview-entry.ts",
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
      metafile: false,
    });

    for (const msg of result.warnings) {
      warnings.push(msg.text);
    }

    const file = result.outputFiles?.[0];
    if (!file || file.text.length === 0) {
      errors.push("esbuild produced empty output.");
      return { ok: false, warnings, errors };
    }

    return {
      ok: true,
      javascript: file.text,
      warnings,
      errors,
    };
  } catch (unknownError: unknown) {
    const msg = unknownError instanceof Error ? unknownError.message : String(unknownError);
    errors.push(msg);
    return { ok: false, warnings, errors };
  }
}
