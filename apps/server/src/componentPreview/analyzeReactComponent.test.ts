// @effect-diagnostics nodeBuiltinImport:off
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { analyzeReactComponentFile } from "./analyzeReactComponent.ts";

describe("analyzeReactComponentFile", () => {
  it("extracts props for a simple function component", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "t3-analyze-react-"));
    try {
      writeFileSync(
        path.join(dir, "tsconfig.json"),
        JSON.stringify({
          compilerOptions: {
            jsx: "react-jsx",
            module: "ESNext",
            target: "ES2022",
          },
        }),
        "utf8",
      );

      const rel = "src/components/Demo.tsx";
      const abs = path.join(dir, ...rel.split("/"));
      mkdirSync(path.dirname(abs), { recursive: true });
      writeFileSync(
        abs,
        `export function Demo(props: { title: string; count?: number }) {
          return <span>{props.title}</span>;
        }
`,
        "utf8",
      );

      const manifest = analyzeReactComponentFile({
        absolutePath: abs,
        cwd: dir,
        relativePathPosix: rel,
      });

      expect(manifest.exports.some((e) => e.name === "Demo")).toBe(true);
      const entry = manifest.propsByExport.find((p) => p.exportName === "Demo");
      expect(entry).toBeDefined();
      const title = entry?.props.find((p) => p.name === "title");
      expect(title?.kind).toBe("string");
      expect(title?.optional).toBe(false);
      const count = entry?.props.find((p) => p.name === "count");
      expect(count?.kind).toBe("number");
      expect(count?.optional).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
