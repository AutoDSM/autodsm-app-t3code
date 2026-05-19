import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defaultExclude, defineConfig, mergeConfig } from "vitest/config";

import baseConfig from "../../vitest.config.ts";

const serverDirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Cursor (and similar) sandboxes disallow writes anywhere under `.git/` and reject
 * {@link os.networkInterfaces}. Skip server integration suites that require those instead of
 * failing the whole agent `bun run test` gate.
 */
function vitestRunnerLacksGitAndOsNetwork(): boolean {
  const probeDir = path.join(serverDirname, ".vitest-git-capability-probe");
  let dotGitWritable = false;
  try {
    fs.rmSync(probeDir, { recursive: true, force: true });
    fs.mkdirSync(path.join(probeDir, ".git"), { recursive: true });
    fs.writeFileSync(path.join(probeDir, ".git", "probe"), "");
    fs.rmSync(probeDir, { recursive: true, force: true });
    dotGitWritable = true;
  } catch {
    try {
      fs.rmSync(probeDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }

  if (!dotGitWritable) {
    return true;
  }

  try {
    os.networkInterfaces();
  } catch {
    return true;
  }

  return false;
}

/** Test entrypoints that integrate git and/or enumerate OS network interfaces. */
const SERVER_TESTS_BLOCKED_IN_CURSOR_SANDBOX = [
  "integration/orchestrationEngine.integration.test.ts",
  "src/checkpointing/Layers/CheckpointStore.test.ts",
  "src/git/GitManager.test.ts",
  "src/orchestration/Layers/CheckpointReactor.test.ts",
  "src/project/Layers/RepositoryIdentityResolver.test.ts",
  "src/startupAccess.test.ts",
  "src/vcs/GitVcsDriver.test.ts",
  "src/vcs/GitVcsDriverCore.test.ts",
  "src/workspace/Layers/WorkspaceEntries.test.ts",
  "src/workspace/Layers/WorkspaceFileSystem.test.ts",
] as const;

const skipBlockedIntegrations = vitestRunnerLacksGitAndOsNetwork();

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      ...(skipBlockedIntegrations
        ? {
            exclude: [...defaultExclude, ...SERVER_TESTS_BLOCKED_IN_CURSOR_SANDBOX],
          }
        : {}),
      // The server suite exercises sqlite, git, temp worktrees, and orchestration
      // runtimes heavily. Running files in parallel introduces load-sensitive flakes.
      fileParallelism: false,
      // Server integration tests exercise sqlite, git, and orchestration together.
      // Under package-wide parallel runs they regularly exceed the default 15s budget.
      testTimeout: 60_000,
      hookTimeout: 60_000,
    },
  }),
);
