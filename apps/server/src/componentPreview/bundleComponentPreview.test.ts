// @effect-diagnostics nodeBuiltinImport:off
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { bundleComponentPreview } from "./bundleComponentPreview.ts";
import { PREVIEW_REACT_GLOBAL } from "./reactRuntimeExports.ts";

function makeWorkspace(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "t3-bundle-preview-"));
  writeFileSync(
    path.join(dir, "package.json"),
    JSON.stringify({
      name: "t3-bundle-preview-test-workspace",
      private: true,
      // Resolve react/react-dom against the monorepo's hoisted copies via the
      // repo's node_modules — esbuild walks up from the workspace dir.
    }),
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

function writeComponent(dir: string, rel: string, body: string): string {
  const abs = path.join(dir, ...rel.split("/"));
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, body, "utf8");
  return abs;
}

describe("bundleComponentPreview — react externalisation", () => {
  it("emits a stub that pulls react bindings from the preview-react global", async () => {
    const dir = makeWorkspace();
    try {
      const abs = writeComponent(
        dir,
        "src/components/Counter.tsx",
        `import { useState } from "react";
export function Counter(): JSX.Element {
  const [n, setN] = useState(0);
  return <button onClick={() => setN(n + 1)}>{n}</button>;
}
`,
      );

      const result = await bundleComponentPreview({
        cwd: dir,
        absoluteComponentPath: abs,
        relativePathPosix: "src/components/Counter.tsx",
        exportName: "Counter",
      });

      expect(result.ok).toBe(true);
      const js = result.javascript ?? "";
      // Stub references the host global, not an inlined React.
      expect(js.includes(PREVIEW_REACT_GLOBAL)).toBe(true);
      expect(js.includes(`["react"]`)).toBe(true);
      // No React internals inlined — the dispatcher-null crash these tests
      // exist to prevent shows up alongside this internals marker.
      expect(js.includes("__SECRET_INTERNALS_DO_NOT_USE")).toBe(false);
      // No bundled React function bodies (we only have stub bindings).
      expect(js.includes("function useState(")).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("emits a jsx-runtime stub for components using JSX", async () => {
    const dir = makeWorkspace();
    try {
      const abs = writeComponent(
        dir,
        "src/components/Hello.tsx",
        `export function Hello(): JSX.Element { return <span>hi</span> }\n`,
      );

      const result = await bundleComponentPreview({
        cwd: dir,
        absoluteComponentPath: abs,
        relativePathPosix: "src/components/Hello.tsx",
        exportName: "Hello",
      });

      expect(result.ok).toBe(true);
      const js = result.javascript ?? "";
      expect(js.includes(`["react/jsx-runtime"]`)).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("still inlines workspace utility imports (only react/react-dom are externalised)", async () => {
    const dir = makeWorkspace();
    try {
      writeComponent(
        dir,
        "src/lib/format.ts",
        `export function formatLabel(s: string): string { return "PREVIEW_BUNDLE_TEST_" + s; }\n`,
      );
      const abs = writeComponent(
        dir,
        "src/components/Labelled.tsx",
        `import { formatLabel } from "../lib/format";
export function Labelled(props: { text: string }): JSX.Element {
  return <span>{formatLabel(props.text)}</span>;
}
`,
      );

      const result = await bundleComponentPreview({
        cwd: dir,
        absoluteComponentPath: abs,
        relativePathPosix: "src/components/Labelled.tsx",
        exportName: "Labelled",
      });

      expect(result.ok).toBe(true);
      const js = result.javascript ?? "";
      // The util's literal marker proves the source was inlined rather than
      // externalised. (Plain ASCII so esbuild's unicode escaping can't
      // confuse the assertion.)
      expect(js.includes("PREVIEW_BUNDLE_TEST_")).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("records an externalisation note in the warnings list", async () => {
    const dir = makeWorkspace();
    try {
      const abs = writeComponent(
        dir,
        "src/components/Plain.tsx",
        `export function Plain(): JSX.Element { return <span/> }\n`,
      );
      const result = await bundleComponentPreview({
        cwd: dir,
        absoluteComponentPath: abs,
        relativePathPosix: "src/components/Plain.tsx",
        exportName: "Plain",
      });
      expect(result.ok).toBe(true);
      expect(
        result.warnings.some((w) => w.includes("Externalised react/react-dom/jsx-runtime")),
      ).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
