// @effect-diagnostics nodeBuiltinImport:off
/**
 * Install an icon package in the workspace, update components.json, and resync tokens.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { spawnSync } from "node:child_process";

import type { AutoDsmBrandProfile, AutoDsmIconLibraryId } from "@t3tools/contracts";

import { detectPackageManager } from "./autoDsmHelpers.ts";
import { resyncBrandTokens } from "./autoDsmTokenStore.ts";

const PACKAGE_BY_LIBRARY: Record<AutoDsmIconLibraryId, string> = {
  lucide: "lucide-react",
  heroicons: "@heroicons/react",
  phosphor: "@phosphor-icons/react",
  radix: "@radix-ui/react-icons",
};

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

function patchComponentsJsonIconLibrary(cwd: string, library: AutoDsmIconLibraryId): void {
  const abs = path.join(cwd, "components.json");
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(fs.readFileSync(abs, "utf8")) as Record<string, unknown>;
  } catch {
    parsed = {
      $schema: "https://ui.shadcn.com/schema.json",
      style: "default",
      rsc: false,
      tsx: true,
      tailwind: {
        config: "",
        css: "src/index.css",
        baseColor: "zinc",
        cssVariables: true,
        prefix: "",
      },
      aliases: {
        components: "~/components",
        utils: "~/lib/utils",
        ui: "~/components/ui",
        lib: "~/lib",
        hooks: "~/hooks",
      },
    };
  }
  parsed.iconLibrary = library;
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
}

/** Install workspace icon library package and return refreshed brand profile. */
export function installIconLibrary(
  cwd: string,
  library: AutoDsmIconLibraryId,
): AutoDsmBrandProfile {
  const pkg = PACKAGE_BY_LIBRARY[library];
  const { command, args } = packageManagerExec(cwd, ["add", pkg]);
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    const stderr = result.stderr?.trim() ?? "";
    const stdout = result.stdout?.trim() ?? "";
    const detail = stderr.length > 0 ? stderr : stdout;
    throw new Error(
      detail.length > 0
        ? `Failed to install ${pkg}: ${detail}`
        : `Failed to install ${pkg} (exit ${String(result.status)})`,
    );
  }
  patchComponentsJsonIconLibrary(cwd, library);
  return resyncBrandTokens(cwd);
}
