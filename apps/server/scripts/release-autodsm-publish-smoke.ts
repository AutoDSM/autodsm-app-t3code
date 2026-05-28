/**
 * AutoDSM publish round-trip smoke.
 *
 * Proves the publish pipeline produces an installable, importable package:
 *   1. scaffold a fixture workspace (a component + a stylesheet)
 *   2. run `exportPublishedExport` (tsup → dist + package.json + README)
 *   3. assert the emitted package shape (entry points, exports map, types, css)
 *   4. bundle a consumer module that imports the package via esbuild
 *      (react/react-dom external) — i.e. the import actually resolves
 *
 * Run: `bun run autodsm:publish-smoke` (from repo root). Exits non-zero on the
 * first failed assertion.
 *
 * The fixture uses a dependency-free component, so this validates the publish
 * *pipeline* (barrel → tsup esm/cjs/dts → exports map → css → importable). Full
 * React/Tailwind resolution depends on the consuming workspace's installed deps
 * and is exercised by the live hero-path smoke instead.
 *
 * @effect-diagnostics nodeBuiltinImport:off
 * @effect-diagnostics globalConsole:off
 */
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { exportPublishedExport } from "../src/autodsm/publishedExportStore.ts";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "autodsm-publish-smoke-"));
process.env.AUTODSM_HOME = path.join(root, "home");

const scriptDir = path.dirname(new URL(import.meta.url).pathname);
const serverDir = path.resolve(scriptDir, "..");
const repoRoot = path.resolve(serverDir, "..", "..");

function fail(message: string): never {
  console.error(`✗ ${message}`);
  process.exit(1);
}

function ok(message: string): void {
  console.log(`✓ ${message}`);
}

function main(): void {
  // 1. Fixture workspace: layout is <workspaceRoot>/system.
  const workspaceRoot = path.join(root, "systems", "smoke-system");
  const systemDir = path.join(workspaceRoot, "system");
  const componentsDir = path.join(systemDir, "src", "components");
  fs.mkdirSync(componentsDir, { recursive: true });
  fs.writeFileSync(
    path.join(workspaceRoot, "meta.json"),
    JSON.stringify({ workspaceId: "smoke-system" }),
  );
  fs.writeFileSync(
    path.join(systemDir, "package.json"),
    JSON.stringify({ name: "@smoke/design-system", version: "0.1.0", dependencies: {} }, null, 2),
  );
  // A real shadcn/Modern-Starter workspace ships a tsconfig with JSX configured;
  // tsup's dts build reads it. Mirror that so the smoke matches reality.
  fs.writeFileSync(
    path.join(systemDir, "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: {
          jsx: "react-jsx",
          module: "esnext",
          moduleResolution: "bundler",
          target: "esnext",
          declaration: true,
          skipLibCheck: true,
          strict: true,
        },
      },
      null,
      2,
    ),
  );
  fs.writeFileSync(
    path.join(componentsDir, "Button.ts"),
    [
      `export interface ButtonProps {`,
      `  readonly label: string;`,
      `  readonly className?: string;`,
      `}`,
      ``,
      `export function Button(props: ButtonProps): string {`,
      `  return [props.className ?? "ds-btn", props.label].join(":");`,
      `}`,
      ``,
    ].join("\n"),
  );
  fs.writeFileSync(path.join(systemDir, "src", "index.css"), `.ds-btn { padding: 8px 12px; }\n`);

  // tsup --dts needs `typescript` resolvable from the workspace's node_modules
  // (exactly how a real `npm install`-ed workspace provides it). Link the repo's
  // copy in so the smoke exercises the real NODE_PATH resolution path.
  const fixtureNodeModules = path.join(systemDir, "node_modules");
  fs.mkdirSync(fixtureNodeModules, { recursive: true });
  const repoTypescript = fs.realpathSync(path.join(repoRoot, "node_modules", "typescript"));
  fs.symlinkSync(repoTypescript, path.join(fixtureNodeModules, "typescript"), "dir");
  ok("fixture workspace scaffolded (typescript linked)");

  // 2. Publish.
  let result: { exportPath: string; packageName: string; componentCount: number };
  try {
    result = exportPublishedExport({ cwd: systemDir });
  } catch (error) {
    fail(`exportPublishedExport threw: ${error instanceof Error ? error.message : String(error)}`);
  }
  const exportDir = result.exportPath;
  ok(`published ${result.packageName} → ${exportDir} (${result.componentCount} component(s))`);

  // 3. Assert package shape.
  const dist = path.join(exportDir, "dist");
  for (const name of ["index-export.js", "index-export.mjs", "index-export.d.ts"]) {
    if (!fs.existsSync(path.join(dist, name))) {
      fail(`missing dist/${name}`);
    }
  }
  ok("dist entry points emitted (cjs + esm + types)");

  const pkg = JSON.parse(fs.readFileSync(path.join(exportDir, "package.json"), "utf8")) as {
    exports?: Record<string, unknown>;
  };
  if (!pkg.exports?.["."] || !pkg.exports["./index.css"]) {
    fail(`package.json exports map missing entries: ${JSON.stringify(pkg.exports)}`);
  }
  ok("package.json exports map present (. + ./index.css)");

  if (!fs.existsSync(path.join(exportDir, "index.css"))) {
    fail("index.css not copied into the package");
  }
  ok("stylesheet shipped");

  const dts = fs.readFileSync(path.join(dist, "index-export.d.ts"), "utf8");
  if (!dts.includes("Button")) {
    fail("emitted types do not export Button");
  }
  ok("types export Button");

  // 4. Consumer import resolves: bundle a module that imports the package's ESM
  //    entry, with react external. If esbuild resolves + bundles, the import path
  //    is valid end-to-end.
  const consumerPath = path.join(root, "consumer.mjs");
  fs.writeFileSync(
    consumerPath,
    [
      `import { Button } from ${JSON.stringify(path.join(dist, "index-export.mjs"))};`,
      `if (typeof Button !== "function") { throw new Error("Button is not a function export"); }`,
      `console.log("consumer import ok");`,
    ].join("\n"),
  );
  const esbuildBin = path.join(serverDir, "node_modules", ".bin", "esbuild");
  const useLocalEsbuild = fs.existsSync(esbuildBin);
  const bundle = spawnSync(
    useLocalEsbuild ? esbuildBin : "bunx",
    [
      ...(useLocalEsbuild ? [] : ["esbuild"]),
      consumerPath,
      "--bundle",
      "--format=esm",
      "--external:react",
      "--external:react-dom",
      `--outfile=${path.join(root, "consumer.bundle.mjs")}`,
    ],
    { encoding: "utf8", shell: true },
  );
  if (bundle.status !== 0) {
    fail(`consumer bundle failed:\n${bundle.stderr || bundle.stdout}`);
  }
  ok("consumer import resolves + bundles (react external)");

  console.log("\n✅ publish round-trip smoke passed");
}

main();
