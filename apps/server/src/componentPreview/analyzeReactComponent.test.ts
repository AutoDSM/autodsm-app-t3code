// @effect-diagnostics nodeBuiltinImport:off
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { analyzeReactComponentBatch, analyzeReactComponentFile } from "./analyzeReactComponent.ts";

const TEMPLATE_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "workspace-templates",
);

describe("analyzeReactComponentFile", () => {
  it("extracts props for a simple function component", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "t3-analyze-react-"));
    try {
      // package.json gates the analyzer past its "workspace not initialized"
      // check; see makeWorkspace() below for the same pattern.
      writeFileSync(
        path.join(dir, "package.json"),
        JSON.stringify({ name: "t3-analyze-react-test-workspace", private: true }),
        "utf8",
      );
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

  function makeWorkspace(): string {
    const dir = mkdtempSync(path.join(tmpdir(), "t3-analyze-react-"));
    // package.json proves to the analyzer that this is a real workspace, not
    // a stale staging path. Without it, the analyzer gate short-circuits with
    // a "Workspace not initialized" diagnostic and skips any file work.
    writeFileSync(
      path.join(dir, "package.json"),
      JSON.stringify({ name: "t3-analyze-react-test-workspace", private: true }),
      "utf8",
    );
    writeFileSync(
      path.join(dir, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: { jsx: "react-jsx", module: "ESNext", target: "ES2022" },
      }),
      "utf8",
    );
    return dir;
  }

  it("filters out interface exports (type-only)", () => {
    const dir = makeWorkspace();
    try {
      const rel = "src/components/WithInterface.tsx";
      const abs = path.join(dir, ...rel.split("/"));
      mkdirSync(path.dirname(abs), { recursive: true });
      writeFileSync(
        abs,
        `export interface FooProps { readonly label?: string }
export function Foo(props: FooProps) { return <span>{props.label}</span> }
`,
        "utf8",
      );

      const manifest = analyzeReactComponentFile({
        absolutePath: abs,
        cwd: dir,
        relativePathPosix: rel,
      });

      const names = manifest.exports.map((ex) => ex.name);
      expect(names).toEqual(["Foo"]);
      expect(names).not.toContain("FooProps");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("filters out type-alias exports", () => {
    const dir = makeWorkspace();
    try {
      const rel = "src/components/WithType.tsx";
      const abs = path.join(dir, ...rel.split("/"));
      mkdirSync(path.dirname(abs), { recursive: true });
      writeFileSync(
        abs,
        `export type FooKind = "a" | "b";
export function Foo() { return <span/> }
`,
        "utf8",
      );

      const manifest = analyzeReactComponentFile({
        absolutePath: abs,
        cwd: dir,
        relativePathPosix: rel,
      });

      expect(manifest.exports.map((ex) => ex.name)).toEqual(["Foo"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("keeps runtime-value exports even when they are not call signatures", () => {
    // `const VERSION = "1.0"` is a value (string) so it MUST stay in the
    // manifest. Frontend uses `kind` to choose what to render — non-renderable
    // values get deprioritised by pickInitialExport, not stripped here.
    const dir = makeWorkspace();
    try {
      const rel = "src/components/WithConst.tsx";
      const abs = path.join(dir, ...rel.split("/"));
      mkdirSync(path.dirname(abs), { recursive: true });
      writeFileSync(
        abs,
        `export const VERSION = "1.0";
export function Foo() { return <span/> }
`,
        "utf8",
      );

      const manifest = analyzeReactComponentFile({
        absolutePath: abs,
        cwd: dir,
        relativePathPosix: rel,
      });

      const names = manifest.exports.map((ex) => ex.name).toSorted();
      expect(names).toEqual(["Foo", "VERSION"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("produces exports when workspace lacks tsconfig.json", () => {
    // Repro for the shadcn-ui "(no registry match)" / "Available exports: (none)"
    // failure: a freshly seeded workspace where ensureViteWorkspaceScaffold
    // was bypassed shouldn't silently drop exports.
    const dir = mkdtempSync(path.join(tmpdir(), "t3-analyze-react-"));
    try {
      // package.json gates the analyzer past its workspace-not-initialized check.
      writeFileSync(
        path.join(dir, "package.json"),
        JSON.stringify({ name: "t3-analyze-react-test-workspace", private: true }),
        "utf8",
      );

      const rel = "src/components/ShadcnButton.tsx";
      const abs = path.join(dir, ...rel.split("/"));
      mkdirSync(path.dirname(abs), { recursive: true });
      writeFileSync(
        abs,
        `import type { JSX } from "react";
export function ShadcnButton(props: { label?: string }): JSX.Element {
  return <button type="button">{props.label ?? "Continue"}</button>;
}
`,
        "utf8",
      );

      const manifest = analyzeReactComponentFile({
        absolutePath: abs,
        cwd: dir,
        relativePathPosix: rel,
      });

      expect(manifest.exports.map((ex) => ex.name)).toContain("ShadcnButton");
      expect(manifest.diagnostics).not.toContain("Could not load source file.");
      expect(manifest.diagnostics).not.toContain("Could not load module symbol.");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("ignores a hostile ancestor tsconfig with invalid rootDir", () => {
    // ts.findConfigFile used to walk upward and merge ancestor settings into
    // the workspace's compilerOptions, breaking single-file analysis. The
    // workspace tsconfig (or its absence) should be the only source.
    const parent = mkdtempSync(path.join(tmpdir(), "t3-analyze-react-parent-"));
    try {
      writeFileSync(
        path.join(parent, "tsconfig.json"),
        JSON.stringify({
          compilerOptions: {
            jsx: "react-jsx",
            module: "ESNext",
            target: "ES2022",
            rootDir: "/this/path/does/not/exist",
            composite: true,
            declaration: true,
          },
        }),
        "utf8",
      );

      const dir = path.join(parent, "workspace");
      mkdirSync(dir, { recursive: true });
      writeFileSync(
        path.join(dir, "package.json"),
        JSON.stringify({ name: "t3-analyze-react-test-workspace", private: true }),
        "utf8",
      );

      const rel = "src/components/Demo.tsx";
      const abs = path.join(dir, ...rel.split("/"));
      mkdirSync(path.dirname(abs), { recursive: true });
      writeFileSync(
        abs,
        `export function Demo() { return <span/> }
`,
        "utf8",
      );

      const manifest = analyzeReactComponentFile({
        absolutePath: abs,
        cwd: dir,
        relativePathPosix: rel,
      });

      expect(manifest.exports.map((ex) => ex.name)).toContain("Demo");
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it("scaffolds missing workspace files on first analyze of a real workspace", () => {
    // The scaffold only runs when package.json is present — that's the gate
    // that prevents the analyzer from materialising phantom workspaces in
    // stale .staging/ paths the frontend might still be sending.
    const dir = mkdtempSync(path.join(tmpdir(), "t3-analyze-react-bare-"));
    try {
      writeFileSync(
        path.join(dir, "package.json"),
        JSON.stringify({ name: "t3-analyze-react-test-workspace", private: true }),
        "utf8",
      );
      const rel = "src/components/Demo.tsx";
      const abs = path.join(dir, ...rel.split("/"));
      mkdirSync(path.dirname(abs), { recursive: true });
      writeFileSync(abs, `export function Demo() { return <span/> }\n`, "utf8");

      analyzeReactComponentFile({
        absolutePath: abs,
        cwd: dir,
        relativePathPosix: rel,
      });

      expect(existsSync(path.join(dir, "tsconfig.json"))).toBe(true);
      expect(existsSync(path.join(dir, "vite.config.ts"))).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("returns workspace-not-initialized when package.json is missing (no scaffold side effects)", () => {
    // Repro for the phantom-staging-workspace bug: the analyzer must never
    // mutate a cwd that doesn't look like a real workspace, or it will
    // re-materialise the directory the staging sweep just deleted.
    const dir = mkdtempSync(path.join(tmpdir(), "t3-analyze-react-uninit-"));
    try {
      const rel = "src/components/ShadcnButton.tsx";
      // Note: NO package.json, NO source file written. The analyzer must
      // detect this and skip everything.
      const manifest = analyzeReactComponentFile({
        absolutePath: path.join(dir, ...rel.split("/")),
        cwd: dir,
        relativePathPosix: rel,
      });

      expect(manifest.exports).toEqual([]);
      expect(manifest.diagnostics[0]).toContain("Workspace not initialized");
      expect(manifest.diagnostics[0]).toContain("package.json is missing");
      // The scaffold side-effects must NOT have run.
      expect(existsSync(path.join(dir, "tsconfig.json"))).toBe(false);
      expect(existsSync(path.join(dir, "vite.config.ts"))).toBe(false);
      expect(existsSync(path.join(dir, "index.html"))).toBe(false);
      expect(existsSync(path.join(dir, "src", "main.tsx"))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("batch returns workspace-not-initialized for every file when package.json is missing", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "t3-analyze-react-batch-uninit-"));
    try {
      const files = ["src/components/A.tsx", "src/components/B.tsx"].map((rel) => ({
        absolutePath: path.join(dir, ...rel.split("/")),
        relativePathPosix: rel,
      }));

      const manifests = analyzeReactComponentBatch({ cwd: dir, files });

      expect(manifests).toHaveLength(2);
      for (const m of manifests) {
        expect(m.exports).toEqual([]);
        expect(m.diagnostics[0]).toContain("Workspace not initialized");
      }
      expect(existsSync(path.join(dir, "tsconfig.json"))).toBe(false);
      expect(existsSync(path.join(dir, "vite.config.ts"))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("analyzeReactComponentBatch extracts exports for every file in one program", () => {
    // Batched analyzer is what the registry indexer uses. The win is loading
    // lib.d.ts once; the contract is that every file gets a manifest whose
    // exports match a per-file analysis.
    const dir = makeWorkspace();
    try {
      const files = [
        { rel: "src/components/Demo1.tsx", body: `export function Demo1() { return <span/> }\n` },
        {
          rel: "src/components/Demo2.tsx",
          body: `export const Demo2 = () => <span/>;\nexport const HELPER = "x";\n`,
        },
        {
          rel: "src/components/Demo3.tsx",
          body: `export interface Demo3Props { label?: string }\nexport function Demo3(props: Demo3Props) { return <span>{props.label}</span> }\n`,
        },
        {
          rel: "src/components/Demo4.tsx",
          body: `export default function Demo4() { return <span/> }\n`,
        },
      ];
      for (const f of files) {
        const abs = path.join(dir, ...f.rel.split("/"));
        mkdirSync(path.dirname(abs), { recursive: true });
        writeFileSync(abs, f.body, "utf8");
      }

      const manifests = analyzeReactComponentBatch({
        cwd: dir,
        files: files.map((f) => ({
          absolutePath: path.join(dir, ...f.rel.split("/")),
          relativePathPosix: f.rel,
        })),
      });

      expect(manifests).toHaveLength(4);
      expect(manifests[0]!.exports.map((e) => e.name)).toEqual(["Demo1"]);
      const demo2Names = manifests[1]!.exports.map((e) => e.name).toSorted();
      expect(demo2Names).toEqual(["Demo2", "HELPER"]);
      expect(manifests[2]!.exports.map((e) => e.name)).toEqual(["Demo3"]); // interface filtered
      expect(manifests[3]!.exports.some((e) => e.isDefault)).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("analyzeReactComponentBatch returns empty list for empty input", () => {
    expect(analyzeReactComponentBatch({ cwd: tmpdir(), files: [] })).toEqual([]);
  });

  it("extracts ShadcnButton exports from the real shadcn-ui template file", () => {
    // Regression for the "(no registry match)" / "Available exports: (none)"
    // failure: the registry indexer feeds every src/components file through
    // this analyzer, so the shadcn template's actual ShadcnButton.tsx must
    // produce a non-empty exports list.
    const dir = mkdtempSync(path.join(tmpdir(), "t3-analyze-react-shadcn-"));
    try {
      // package.json gates the analyzer past its workspace-not-initialized check.
      writeFileSync(
        path.join(dir, "package.json"),
        JSON.stringify({ name: "t3-analyze-react-test-workspace", private: true }),
        "utf8",
      );
      const rel = "src/components/ShadcnButton.tsx";
      const abs = path.join(dir, ...rel.split("/"));
      mkdirSync(path.dirname(abs), { recursive: true });
      const templateAbs = path.join(
        TEMPLATE_ROOT,
        "shadcn-ui",
        "src",
        "components",
        "ShadcnButton.tsx",
      );
      copyFileSync(templateAbs, abs);

      const manifest = analyzeReactComponentFile({
        absolutePath: abs,
        cwd: dir,
        relativePathPosix: rel,
      });

      const names = manifest.exports.map((ex) => ex.name);
      expect(names).toContain("ShadcnButton");
      expect(names).toContain("ShadcnButtonOutline");
      expect(manifest.diagnostics).not.toContain("Could not load source file.");
      expect(manifest.diagnostics).not.toContain("Could not load module symbol.");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
