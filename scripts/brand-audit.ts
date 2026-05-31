// @effect-diagnostics nodeBuiltinImport:off
// @effect-diagnostics globalConsole:off
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const SCAN_ROOTS = [
  "apps/web/src",
  "apps/desktop/src",
  "apps/marketing/src",
  "apps/server/src",
  "packages/contracts/src",
  "packages/ssh/src",
  "scripts",
  "docs",
  "REMOTE.md",
  "KEYBINDINGS.md",
  "README.md",
  "COLAB.md",
] as const;

const SKIP_DIR_NAMES = new Set(["node_modules", "dist", "dist-electron", ".turbo"]);

const SCAN_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".mjs",
  ".js",
  ".astro",
  ".md",
  ".html",
  ".yml",
  ".yaml",
]);

const BRAND_PATTERNS = [/\bT3 Code\b/i, /\bT3Code\b/, /\bt3 code\b/i] as const;

const LINE_ALLOWLIST = [
  /T3CODE_/,
  /t3code:/,
  /t3code\//,
  /@t3tools/,
  /pingdotgg\/t3code/i,
  /\.t3code/,
  /com\.t3tools/,
  /oxlint-plugin-t3code/,
  /legacyUserDataDirName/,
  /T3 Code \(Dev\)/,
  /T3 Code \(Alpha\)/,
  /T3Tools\.T3Code/,
  /t3-code/,
  /t3code-bin/,
  /T3 Code is the engine/,
  /T3Tools Inc/,
  /T3_SSH_AUTH_SECRET/,
  /devRemoteT3Server/,
  /__t3code\//,
  /\/Applications\/T3 Code\.app/,
  /npx t3\b/,
  /Command\.make\("t3"/,
  /whitespace-pre-wrap/,
] as const;

const SKIP_FILES = new Set([
  "AGENTS.md",
  "AUTODSM.md",
  "brand-audit.ts",
  "22-autodsm-brand-cutover.md",
]);

function shouldSkipPath(relativePath: string): boolean {
  const parts = relativePath.split("/");
  if (parts.some((part) => SKIP_DIR_NAMES.has(part))) {
    return true;
  }
  if (parts[0] === "skills" || parts[0] === ".plans") {
    return true;
  }
  if (parts.includes("autodsm-target-state")) {
    return true;
  }
  const baseName = parts.at(-1);
  if (baseName && SKIP_FILES.has(baseName)) {
    return true;
  }
  return false;
}

function collectFiles(targetPath: string, files: string[] = []): string[] {
  const absolutePath = resolve(repoRoot, targetPath);
  let stat;
  try {
    stat = statSync(absolutePath);
  } catch {
    return files;
  }

  if (stat.isFile()) {
    files.push(absolutePath);
    return files;
  }

  if (!stat.isDirectory()) {
    return files;
  }

  for (const entry of readdirSync(absolutePath)) {
    const nextPath = join(absolutePath, entry);
    const relativePath = relative(repoRoot, nextPath);
    if (shouldSkipPath(relativePath)) {
      continue;
    }
    const nextStat = statSync(nextPath);
    if (nextStat.isDirectory()) {
      collectFiles(relativePath, files);
      continue;
    }
    const extension = entry.includes(".") ? `.${entry.split(".").pop()}` : "";
    if (SCAN_EXTENSIONS.has(extension)) {
      files.push(nextPath);
    }
  }

  return files;
}

function isAllowlistedLine(line: string): boolean {
  return LINE_ALLOWLIST.some((pattern) => pattern.test(line));
}

function auditFile(absolutePath: string): Array<{ line: number; text: string }> {
  const content = readFileSync(absolutePath, "utf8");
  const violations: Array<{ line: number; text: string }> = [];

  content.split("\n").forEach((line, index) => {
    if (isAllowlistedLine(line)) {
      return;
    }
    if (BRAND_PATTERNS.some((pattern) => pattern.test(line))) {
      violations.push({ line: index + 1, text: line.trim() });
    }
  });

  return violations;
}

function main(): number {
  const files = SCAN_ROOTS.flatMap((root) => collectFiles(root));
  const violations: Array<{ file: string; line: number; text: string }> = [];

  for (const file of files) {
    for (const violation of auditFile(file)) {
      violations.push({
        file: relative(repoRoot, file),
        ...violation,
      });
    }
  }

  if (violations.length === 0) {
    console.log("brand-audit: no unapproved T3 Code product strings found.");
    return 0;
  }

  console.error(`brand-audit: found ${violations.length} unapproved reference(s):\n`);
  for (const violation of violations) {
    console.error(`${violation.file}:${violation.line}: ${violation.text}`);
  }
  return 1;
}

process.exit(main());
