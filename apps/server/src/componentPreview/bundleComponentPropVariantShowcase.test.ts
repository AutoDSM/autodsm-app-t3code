// @effect-diagnostics nodeBuiltinImport:off
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { bundleComponentPropVariantShowcase } from "./bundleComponentPropVariantShowcase.ts";

function makeWorkspace(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "t3-bundle-prop-variant-"));
  writeFileSync(
    path.join(dir, "package.json"),
    JSON.stringify({ name: "t3-bundle-prop-variant-test-workspace", private: true }),
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

const BUTTON_SOURCE = `export function Button(props: { variant?: "default" | "outline"; label?: string }): JSX.Element {
  return <button className={props.variant ?? "default"}>{props.label ?? "Button"}</button>;
}
`;

describe("bundleComponentPropVariantShowcase", () => {
  it("bundles a prop-variant grid for a single export", async () => {
    const dir = makeWorkspace();
    try {
      const abs = writeComponent(dir, "src/components/Button.tsx", BUTTON_SOURCE);

      const result = await bundleComponentPropVariantShowcase({
        cwd: dir,
        absoluteComponentPath: abs,
        relativePathPosix: "src/components/Button.tsx",
        exportName: "Button",
        cells: [
          { section: "variant", label: "default", propsJson: JSON.stringify({ variant: "default" }) },
          { section: "variant", label: "outline", propsJson: JSON.stringify({ variant: "outline" }) },
        ],
      });

      expect(result.ok).toBe(true);
      const js = result.javascript ?? "";
      // The single export is imported once and rendered per cell.
      expect(js.includes("Button")).toBe(true);
      // Cell labels and the section heading are embedded.
      expect(js.includes("outline")).toBe(true);
      expect(js.includes("variant")).toBe(true);
      expect(result.warnings.some((w) => w.includes("2 cells"))).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("renders the default export when exportName is 'default'", async () => {
    const dir = makeWorkspace();
    try {
      const abs = writeComponent(
        dir,
        "src/components/Badge.tsx",
        `export default function Badge(props: { tone?: string }): JSX.Element { return <span>{props.tone}</span>; }\n`,
      );

      const result = await bundleComponentPropVariantShowcase({
        cwd: dir,
        absoluteComponentPath: abs,
        relativePathPosix: "src/components/Badge.tsx",
        exportName: "default",
        cells: [{ section: "tone", label: "info", propsJson: JSON.stringify({ tone: "info" }) }],
      });

      expect(result.ok).toBe(true);
      expect((result.javascript ?? "").length).toBeGreaterThan(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("tolerates malformed propsJson by rendering with empty props", async () => {
    const dir = makeWorkspace();
    try {
      const abs = writeComponent(dir, "src/components/Button.tsx", BUTTON_SOURCE);

      const result = await bundleComponentPropVariantShowcase({
        cwd: dir,
        absoluteComponentPath: abs,
        relativePathPosix: "src/components/Button.tsx",
        exportName: "Button",
        cells: [{ section: "variant", label: "broken", propsJson: "{ not json" }],
      });

      expect(result.ok).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
