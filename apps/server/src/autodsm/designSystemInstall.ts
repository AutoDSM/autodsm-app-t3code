// @effect-diagnostics nodeBuiltinImport:off
/**
 * Run starter-specific design-system CLI recipes and scripted theme fallbacks.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { spawnSync } from "node:child_process";

import type { AutoDsmWorkspaceStarterId } from "@t3tools/contracts";
import * as Effect from "effect/Effect";

import { ProcessRunner } from "../processRunner.ts";
import { detectPackageManager, extractBrandTokens } from "./autoDsmHelpers.ts";
import { CHAKRA_THEME_TS, MUI_THEME_TS, themeCssForStarter } from "./designSystemThemeContent.ts";
import { ensureViteWorkspaceScaffold } from "./viteWorkspaceScaffold.ts";

export interface DesignSystemInstallResult {
  readonly starterId: AutoDsmWorkspaceStarterId;
  readonly cssPath: string;
  readonly cliAttempted: boolean;
  readonly cliSucceeded: boolean;
  readonly tokenCount: number;
}

function packageManagerExec(
  cwd: string,
  args: readonly string[],
): { readonly command: string; readonly args: readonly string[] } {
  const pm = detectPackageManager(cwd);
  switch (pm) {
    case "bun":
      return { command: "bun", args };
    case "pnpm":
      return { command: "pnpm", args };
    case "yarn":
      return { command: "yarn", args };
    case "npm":
      return { command: "npm", args };
    default:
      return { command: "bun", args };
  }
}

function writeThemeCss(cwd: string, starterId: AutoDsmWorkspaceStarterId): string {
  const cssPath = path.join(cwd, "src/index.css");
  fs.mkdirSync(path.dirname(cssPath), { recursive: true });
  const content = themeCssForStarter(starterId);
  fs.writeFileSync(cssPath, content.endsWith("\n") ? content : `${content}\n`, "utf8");
  return cssPath;
}

function writeLibraryThemeModules(cwd: string, starterId: AutoDsmWorkspaceStarterId): void {
  if (starterId !== "mui" && starterId !== "chakra-ui") {
    return;
  }
  const themeDir = path.join(cwd, "src/theme");
  fs.mkdirSync(themeDir, { recursive: true });
  if (starterId === "mui") {
    fs.writeFileSync(path.join(themeDir, "muiTheme.ts"), MUI_THEME_TS, "utf8");
  }
  if (starterId === "chakra-ui") {
    fs.writeFileSync(path.join(themeDir, "chakraTheme.ts"), CHAKRA_THEME_TS, "utf8");
  }
}

function cssHasTokens(cwd: string): boolean {
  return extractBrandTokens(cwd).length > 0;
}

function devDependencyArgs(starterId: AutoDsmWorkspaceStarterId): readonly string[] {
  const base = ["add", "-D", "vite", "@vitejs/plugin-react", "tailwindcss", "@tailwindcss/vite"];
  switch (starterId) {
    case "mui":
      return ["add", "@mui/material", "@emotion/react", "@emotion/styled"];
    case "chakra-ui":
      return ["add", "@chakra-ui/react", "@emotion/react", "@emotion/styled", "framer-motion"];
    default:
      return base;
  }
}

function tryShadcnCli(cwd: string): boolean {
  if (process.env.AUTODSM_SKIP_CLI === "1") {
    return false;
  }
  const { command, args } = packageManagerExec(cwd, [
    "x",
    "shadcn@latest",
    "init",
    "-t",
    "vite",
    "-y",
  ]);
  try {
    const result = spawnSync(command, [...args], {
      cwd,
      encoding: "utf8",
      timeout: 120_000,
    });
    return result.status === 0 && cssHasTokens(cwd);
  } catch {
    return false;
  }
}

/** Synchronous install used in tests and when ProcessRunner is unavailable. */
export function installDesignSystemSync(input: {
  readonly starterId: AutoDsmWorkspaceStarterId;
  readonly cwd: string;
  readonly skipPackageInstall?: boolean;
}): DesignSystemInstallResult {
  const cwd = path.resolve(input.cwd);
  ensureViteWorkspaceScaffold(cwd);

  let cliAttempted = false;
  let cliSucceeded = false;

  if (!input.skipPackageInstall && process.env.AUTODSM_SKIP_CLI !== "1") {
    if (input.starterId === "shadcn-ui") {
      cliAttempted = true;
      cliSucceeded = tryShadcnCli(cwd);
    }
  }

  if (!cssHasTokens(cwd)) {
    writeThemeCss(cwd, input.starterId);
  }
  writeLibraryThemeModules(cwd, input.starterId);

  const cssPath = path.join(cwd, "src/index.css");
  const tokenCount = extractBrandTokens(cwd).length;

  return {
    starterId: input.starterId,
    cssPath,
    cliAttempted,
    cliSucceeded,
    tokenCount,
  };
}

/** Effectful install: package adds + optional shadcn CLI + scripted theme fallback. */
export function installDesignSystem(input: {
  readonly starterId: AutoDsmWorkspaceStarterId;
  readonly cwd: string;
}): Effect.Effect<DesignSystemInstallResult, never, ProcessRunner> {
  return Effect.gen(function* () {
    const cwd = path.resolve(input.cwd);
    ensureViteWorkspaceScaffold(cwd);

    if (process.env.AUTODSM_SKIP_INSTALL !== "1") {
      const { command, args } = packageManagerExec(cwd, devDependencyArgs(input.starterId));
      const depResult = spawnSync(command, [...args], {
        cwd,
        encoding: "utf8",
        timeout: 120_000,
      });
      if (depResult.status !== 0) {
        yield* Effect.logWarning("autodsm.designSystemInstall.deps", {
          starterId: input.starterId,
          command,
          code: depResult.status,
        });
      }
    }

    let cliAttempted = false;
    let cliSucceeded = false;

    if (input.starterId === "shadcn-ui") {
      cliAttempted = true;
      cliSucceeded = tryShadcnCli(cwd);
    }

    if (!cssHasTokens(cwd)) {
      writeThemeCss(cwd, input.starterId);
    }
    writeLibraryThemeModules(cwd, input.starterId);

    const tokenCount = extractBrandTokens(cwd).length;
    return {
      starterId: input.starterId,
      cssPath: path.join(cwd, "src/index.css"),
      cliAttempted,
      cliSucceeded,
      tokenCount,
    } satisfies DesignSystemInstallResult;
  });
}
