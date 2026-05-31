// @effect-diagnostics nodeBuiltinImport:off
// @effect-diagnostics globalDate:off
// @effect-diagnostics globalConsole:off
import * as fs from "node:fs/promises";
import * as path from "node:path";

import type { ProjectBuildComponentPreviewResult } from "@t3tools/contracts";
import * as esbuild from "esbuild";

import {
  PREVIEW_REACT_EXTERNAL_FILTER,
  PREVIEW_REACT_EXTERNALS,
  PREVIEW_REACT_GLOBAL,
} from "./reactRuntimeExports.ts";

const PREVIEW_REACT_NAMESPACE = "t3-preview-react-external";

/**
 * Re-routes every `import … from "react" | "react-dom" | "react/jsx-runtime"
 * | "react/jsx-dev-runtime"` in the workspace component bundle to a stub
 * module that proxies bindings out of `globalThis.__T3_PREVIEW_REACT__`. The
 * iframe runtime (`ComponentPreviewRuntimeApp.tsx`) populates that global
 * with its OWN React before importing the blob. Without this plugin esbuild
 * inlines the workspace's React copy and the blob ends up with a second
 * React whose hook dispatcher is null — that's the
 * "Cannot read properties of null (reading 'useState')" error in the iframe.
 */
const previewReactExternalPlugin: esbuild.Plugin = {
  name: PREVIEW_REACT_NAMESPACE,
  setup(build) {
    build.onResolve({ filter: PREVIEW_REACT_EXTERNAL_FILTER }, (args) => {
      if (!Object.hasOwn(PREVIEW_REACT_EXTERNALS, args.path)) {
        // Specifier matched the filter but isn't one we proxy (e.g.
        // `react-dom/client`). Let esbuild resolve it normally.
        return null;
      }
      return { path: args.path, namespace: PREVIEW_REACT_NAMESPACE };
    });

    build.onLoad({ filter: /.*/, namespace: PREVIEW_REACT_NAMESPACE }, (args) => {
      const names = PREVIEW_REACT_EXTERNALS[args.path];
      if (!names) {
        return null;
      }
      const literalKey = JSON.stringify(args.path);
      const globalAccess = `globalThis.${PREVIEW_REACT_GLOBAL}?.[${literalKey}]`;
      const lines: string[] = [
        `const __mod = ${globalAccess};`,
        `if (!__mod) {`,
        `  throw new Error("Preview React host has not registered globalThis.${PREVIEW_REACT_GLOBAL}[" + ${literalKey} + "]. Ensure the iframe runtime imported the host React before importing the preview bundle.");`,
        `}`,
      ];
      for (const name of names) {
        // Re-export as a binding so consumers that destructure (most user
        // code) work; esbuild needs the export to be statically declared.
        lines.push(`export const ${name} = __mod[${JSON.stringify(name)}];`);
      }
      lines.push(`export default __mod.default ?? __mod;`);
      return { contents: `${lines.join("\n")}\n`, loader: "js" };
    });
  },
};

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

  const startedAtMs = Date.now();
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
      // Capture the module graph in dev so slow/stuck builds can be triaged
      // from the diagnostic banner (it surfaces `inputs` count + duration).
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
        `esbuild produced empty output for export "${input.exportName}" in ${input.relativePathPosix} (bundled ${moduleCount} modules in ${durationMs}ms — most likely a type-only export).`,
      );
      // eslint-disable-next-line no-console
      console.error("[component-preview] empty-output", {
        relativePath: input.relativePathPosix,
        exportName: input.exportName,
        durationMs,
        moduleCount,
      });
      return { ok: false, warnings, errors };
    }

    // eslint-disable-next-line no-console
    console.info("[component-preview] bundled", {
      relativePath: input.relativePathPosix,
      exportName: input.exportName,
      durationMs,
      moduleCount,
      bytes: file.text.length,
    });
    warnings.push(`Bundled ${moduleCount} modules in ${durationMs}ms.`);
    warnings.push(
      `Externalised react/react-dom/jsx-runtime — host iframe must register window.${PREVIEW_REACT_GLOBAL}.`,
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
    // eslint-disable-next-line no-console
    console.error("[component-preview] esbuild-error", {
      relativePath: input.relativePathPosix,
      exportName: input.exportName,
      durationMs,
      message: msg,
    });
    return { ok: false, warnings, errors };
  }
}
