// @effect-diagnostics nodeBuiltinImport:off
/**
 * Sandbox agents (Cursor, etc.) may forbid writes under `.git/hooks/` for temp clones.
 * Steer Git's hooks directory to an **in-workspace** empty directory whenever Vitest drives
 * subprocesses. (Some sandboxes allow only the repo root, not system TMPDIR.)
 *
 * Vitest-driven git runs also set {@link vitestGitSpawnEnv} (`GIT_TEMPLATE_DIR`) so `git init`
 * does not populate `.git/hooks/` from the system template (`core.hooksPath` alone does not).
 */
import fs from "node:fs";
import nodePath from "node:path";

let emptyVitestGitHooksDirectory: string | undefined;
let emptyVitestGitTemplateDirectory: string | undefined;

/** True when this Node process is executing under Vitest (incl. forked workers). */
function isVitestProcess(): boolean {
  const env = globalThis.process.env;
  return (
    env.VITEST === "true" || env.VITEST_WORKER_ID !== undefined || env.VITEST_POOL_ID !== undefined
  );
}

/**
 * Env vars merged into Vitest-driven `git` subprocesses.
 * Empty `GIT_TEMPLATE_DIR` skips installing sample hooks into `.git/hooks/` (sandbox-restricted).
 */
export function vitestGitSpawnEnv(): Record<string, string> {
  if (!isVitestProcess()) {
    return {};
  }
  if (emptyVitestGitTemplateDirectory === undefined) {
    const dir = nodePath.join(globalThis.process.cwd(), ".vitest-git-template-empty");
    fs.mkdirSync(dir, { recursive: true });
    emptyVitestGitTemplateDirectory = dir;
  }
  return { GIT_TEMPLATE_DIR: emptyVitestGitTemplateDirectory };
}

/** Args to prefix every `git` CLI invocation (`git [prefix...] [...rest]`). */
export function vitestGitArgsPrefix(): readonly string[] {
  if (!isVitestProcess() || globalThis.process.env.T3CODE_TEST_ALLOW_HOOKS === "1") {
    return [];
  }
  if (emptyVitestGitHooksDirectory === undefined) {
    const dir = nodePath.join(globalThis.process.cwd(), ".vitest-git-hooks-empty");
    fs.mkdirSync(dir, { recursive: true });
    emptyVitestGitHooksDirectory = dir;
  }
  return ["-c", `core.hooksPath=${emptyVitestGitHooksDirectory}`];
}
