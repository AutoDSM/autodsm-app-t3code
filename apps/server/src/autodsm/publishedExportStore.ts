// @effect-diagnostics nodeBuiltinImport:off
// @effect-diagnostics globalDate:off
// @effect-diagnostics globalConsole:off
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { spawnSync } from "node:child_process";

import {
  AutoDsmPublishedExport,
  AutoDsmPublishedExportId,
  type AutoDsmPublishedExportInput,
} from "@t3tools/contracts";

import { resolveAutodsmUserRoot } from "./autodsmWorkspaceHistory.ts";
import { resolveAutodsmWorkspaceLayout } from "./autodsmWorkspacePaths.ts";

function readPackageName(systemDir: string): string {
  try {
    const raw = fs.readFileSync(path.join(systemDir, "package.json"), "utf8");
    const parsed = JSON.parse(raw) as { name?: string; version?: string };
    const name = parsed.name?.trim();
    return name && name.length > 0 ? name : "autodsm-system";
  } catch {
    return "autodsm-system";
  }
}

function readPackageVersion(systemDir: string, override?: string): string {
  if (override?.trim()) {
    return override.trim();
  }
  try {
    const raw = fs.readFileSync(path.join(systemDir, "package.json"), "utf8");
    const parsed = JSON.parse(raw) as { version?: string };
    const version = parsed.version?.trim();
    return version && version.length > 0 ? version : "0.1.0";
  } catch {
    return "0.1.0";
  }
}

function countComponentFiles(systemDir: string): number {
  return findComponentFiles(systemDir).length;
}

function findComponentFiles(systemDir: string): string[] {
  const componentsDir = path.join(systemDir, "src", "components");
  const files: string[] = [];
  const walk = (dir: string): void => {
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }
      if (/\.(tsx|ts|jsx|js)$/.test(entry.name)) {
        files.push(fullPath);
      }
    }
  };
  walk(componentsDir);
  return files;
}

function countTokenEntries(tokensPath: string): number {
  try {
    const raw = fs.readFileSync(tokensPath, "utf8");
    const parsed = JSON.parse(raw) as { tokens?: unknown[] };
    return Array.isArray(parsed.tokens) ? parsed.tokens.length : 0;
  } catch {
    return 0;
  }
}

// Credentials manager
interface SavedCredentials {
  tokens: Record<string, string>;
}

const credentialsFile = path.join(resolveAutodsmUserRoot(), "credentials.json");

export function saveRegistryToken(registryUrl: string, token: string): void {
  let creds: SavedCredentials = { tokens: {} };
  try {
    if (fs.existsSync(credentialsFile)) {
      creds = JSON.parse(fs.readFileSync(credentialsFile, "utf8")) as SavedCredentials;
    }
  } catch {}
  if (!creds.tokens) creds.tokens = {};
  creds.tokens[registryUrl] = token;
  fs.mkdirSync(path.dirname(credentialsFile), { recursive: true });
  fs.writeFileSync(credentialsFile, JSON.stringify(creds, null, 2), "utf8");
}

export function getRegistryToken(registryUrl: string): string | null {
  try {
    if (fs.existsSync(credentialsFile)) {
      const creds = JSON.parse(fs.readFileSync(credentialsFile, "utf8")) as SavedCredentials;
      return creds.tokens?.[registryUrl] ?? null;
    }
  } catch {}
  return null;
}

export function exportPublishedExport(input: AutoDsmPublishedExportInput): AutoDsmPublishedExport {
  const layout = resolveAutodsmWorkspaceLayout(input.cwd);
  const packageName = readPackageName(layout.systemDir);
  const version = readPackageVersion(layout.systemDir, input.version);
  const exportDir = path.join(
    resolveAutodsmUserRoot(),
    "exports",
    `${layout.workspaceId}-${version}`,
  );
  fs.mkdirSync(exportDir, { recursive: true });

  // 1. Scan for component files and generate dynamic index-export.ts
  const componentFiles = findComponentFiles(layout.systemDir);
  const exportedNames = new Set<string>();
  const indexLines: string[] = [];

  if (componentFiles.length > 0) {
    for (const filePath of componentFiles) {
      const rel = path.relative(path.join(layout.systemDir, "src"), filePath);
      const importPath = "./" + rel.replace(/\.[^/.]+$/, "").replace(/\\/g, "/");
      const baseName = path.basename(filePath, path.extname(filePath));
      let fileContent = "";
      try {
        fileContent = fs.readFileSync(filePath, "utf8");
      } catch {}

      const hasDefault = /export\s+default\b/.test(fileContent);
      indexLines.push(`export * from '${importPath}';`);

      if (hasDefault) {
        let exportName = baseName;
        const firstChar = exportName[0];
        if (firstChar) {
          exportName = firstChar.toUpperCase() + exportName.slice(1);
        }
        if (!exportedNames.has(exportName)) {
          exportedNames.add(exportName);
          indexLines.push(`export { default as ${exportName} } from '${importPath}';`);
        }
      }
    }
  }

  const indexTempPath = path.join(layout.systemDir, "src", "index-export.ts");
  fs.writeFileSync(indexTempPath, indexLines.join("\n") + "\n", "utf8");

  // 2. Compile with tsup
  try {
    const tsupResult = spawnSync(
      "bunx",
      [
        "tsup",
        "src/index-export.ts",
        "--format",
        "esm,cjs",
        "--dts",
        "--clean",
        "--out-dir",
        path.join(exportDir, "dist"),
        "--external",
        "react,react-dom",
      ],
      {
        cwd: layout.systemDir,
        encoding: "utf8",
        shell: true,
      },
    );

    if (tsupResult.status !== 0) {
      throw new Error(`tsup compilation failed:\n${tsupResult.stderr || tsupResult.stdout}`);
    }
  } finally {
    // Clean up temporary index file
    try {
      if (fs.existsSync(indexTempPath)) {
        fs.unlinkSync(indexTempPath);
      }
    } catch {}
  }

  // 3. Copy index.css if it exists
  const cssSrc = path.join(layout.systemDir, "src", "index.css");
  if (fs.existsSync(cssSrc)) {
    fs.copyFileSync(cssSrc, path.join(exportDir, "index.css"));
  }

  // 4. Generate package.json
  let systemDependencies: Record<string, string> = {};
  try {
    const rawPkg = fs.readFileSync(path.join(layout.systemDir, "package.json"), "utf8");
    const parsed = JSON.parse(rawPkg) as { dependencies?: Record<string, string> };
    systemDependencies = parsed.dependencies || {};
  } catch {}

  const pkgJson = {
    name: packageName,
    version,
    description: "AutoDSM generated design system component library",
    main: "./dist/index-export.js",
    module: "./dist/index-export.mjs",
    types: "./dist/index-export.d.ts",
    files: ["dist", "index.css"],
    peerDependencies: {
      react: "^18.0.0 || ^19.0.0",
      "react-dom": "^18.0.0 || ^19.0.0",
    },
    dependencies: systemDependencies,
  };

  fs.writeFileSync(
    path.join(exportDir, "package.json"),
    JSON.stringify(pkgJson, null, 2) + "\n",
    "utf8",
  );

  // 5. Generate README.md
  const readmeContent = `# ${packageName} (v${version})

This component library was built using AutoDSM.

## Installation

\`\`\`bash
npm install ${exportDir}
\`\`\`

## Usage

Import components and styles in your React application:

\`\`\`tsx
import { ${Array.from(exportedNames).join(", ") || "Button"} } from '${packageName}';
import '${packageName}/index.css';
\`\`\`

## Exported Components
${componentFiles.map((f) => `- ${path.basename(f, path.extname(f))}`).join("\n")}
`;
  fs.writeFileSync(path.join(exportDir, "README.md"), readmeContent, "utf8");

  // 6. Handle remote registry publishing
  let targetRegistry = input.registryUrl?.trim();
  let token = input.authToken?.trim();

  // Lookup saved token if registry is specified but no token provided
  if (targetRegistry && !token) {
    token = getRegistryToken(targetRegistry) ?? undefined;
  }

  if (targetRegistry && token) {
    // Save token if provided explicitly
    if (input.authToken?.trim()) {
      saveRegistryToken(targetRegistry, token);
    }

    const npmrcPath = path.join(exportDir, ".npmrc");
    try {
      const urlObj = new URL(targetRegistry);
      const registryDomain = urlObj.host;
      const npmrcContent = `//${registryDomain}/:_authToken=${token}\nregistry=${targetRegistry}\n`;
      fs.writeFileSync(npmrcPath, npmrcContent, "utf8");

      const publishResult = spawnSync("npm", ["publish", "--access", "public"], {
        cwd: exportDir,
        encoding: "utf8",
        shell: true,
      });

      if (publishResult.status !== 0) {
        throw new Error(`npm publish failed:\n${publishResult.stderr || publishResult.stdout}`);
      }
    } finally {
      // Always delete token file from export directory
      try {
        if (fs.existsSync(npmrcPath)) {
          fs.unlinkSync(npmrcPath);
        }
      } catch {}
    }
  }

  // 7. Git commit and tag version bump if Git is active
  if (fs.existsSync(path.join(layout.systemDir, ".git"))) {
    try {
      // Update package.json version in layout.systemDir
      const rawPkg = fs.readFileSync(path.join(layout.systemDir, "package.json"), "utf8");
      const parsed = JSON.parse(rawPkg) as { version?: string };
      parsed.version = version;
      fs.writeFileSync(
        path.join(layout.systemDir, "package.json"),
        JSON.stringify(parsed, null, 2) + "\n",
        "utf8",
      );

      spawnSync("git", ["add", "package.json"], { cwd: layout.systemDir });
      spawnSync("git", ["commit", "-m", `chore(release): v${version}`], { cwd: layout.systemDir });
      spawnSync("git", ["tag", `v${version}`], { cwd: layout.systemDir });
    } catch (e) {
      console.error("Git commit/tag failed:", e);
    }
  }

  const manifest = {
    workspaceId: layout.workspaceId,
    packageName,
    version,
    exportedAt: new Date().toISOString(),
    sourceSystemDir: layout.systemDir,
  };
  fs.writeFileSync(
    path.join(exportDir, "export-manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );

  return {
    id: AutoDsmPublishedExportId.make(crypto.randomUUID()),
    workspaceId: layout.workspaceId,
    cwd: input.cwd,
    packageName,
    version,
    exportPath: exportDir,
    componentCount: componentFiles.length,
    tokenCount: countTokenEntries(path.join(layout.systemDir, "tokens.json")),
    createdAt: manifest.exportedAt,
  };
}
