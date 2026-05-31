import type { EnvironmentApi, EnvironmentId } from "@t3tools/contracts";

import { readEnvironmentApi } from "~/environmentApi";
import {
  ensureEnvironmentConnectionBootstrapped,
  readEnvironmentConnection,
} from "~/environments/runtime";
import { ensurePrimaryEnvironmentReady } from "~/environments/primary";

export async function waitForOnboardingEnvironmentApi(
  environmentId: EnvironmentId,
  options?: { readonly timeoutMs?: number; readonly pollMs?: number },
): Promise<EnvironmentApi | null> {
  const timeoutMs = options?.timeoutMs ?? 120_000;
  const pollMs = options?.pollMs ?? 300;
  const deadline = Date.now() + timeoutMs;

  await ensurePrimaryEnvironmentReady();

  while (Date.now() < deadline) {
    await ensureEnvironmentConnectionBootstrapped(environmentId).catch(() => undefined);

    const api = readEnvironmentApi(environmentId);
    const connection = readEnvironmentConnection(environmentId);
    if (api !== undefined && connection !== null) {
      try {
        await connection.ensureBootstrapped();
        return api;
      } catch {
        // Connection not ready yet — keep polling.
      }
    }

    await new Promise<void>((resolve) => {
      setTimeout(resolve, pollMs);
    });
  }

  return readEnvironmentApi(environmentId) ?? null;
}
