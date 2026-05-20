import { scopedThreadKey, scopeThreadRef } from "@t3tools/client-runtime";
import type {
  AutoDsmComponentAgentRecord,
  EnvironmentApi,
  EnvironmentId,
  ThreadId,
} from "@t3tools/contracts";

import { canonicalAutoDsmComponentPreviewPath } from "~/lib/autoDsmComponentPreviewPath";

export interface AutoDsmComponentAgentLaunchTarget {
  readonly threadId: ThreadId;
  readonly componentPath: string;
}

export function buildComponentAgentPathMap(
  environmentId: EnvironmentId,
  agents: readonly AutoDsmComponentAgentRecord[],
): Record<string, string> {
  const paths: Record<string, string> = {};
  for (const agent of agents) {
    const ref = scopeThreadRef(environmentId, agent.threadId as ThreadId);
    const canonical = canonicalAutoDsmComponentPreviewPath(agent.componentPath);
    if (!canonical) {
      continue;
    }
    paths[scopedThreadKey(ref)] = canonical;
  }
  return paths;
}

export function pickPrimaryComponentAgentLaunchTarget(
  agents: readonly AutoDsmComponentAgentRecord[],
): AutoDsmComponentAgentLaunchTarget | null {
  const first = agents[0];
  if (!first) {
    return null;
  }
  const componentPath = canonicalAutoDsmComponentPreviewPath(first.componentPath);
  if (!componentPath) {
    return null;
  }
  return {
    threadId: first.threadId as ThreadId,
    componentPath,
  };
}

export async function fetchAutoDsmComponentAgentLaunch(
  api: EnvironmentApi,
  cwd: string,
  environmentId: EnvironmentId,
): Promise<{
  readonly paths: Record<string, string>;
  readonly launchTarget: AutoDsmComponentAgentLaunchTarget | null;
}> {
  const result = await api.autodsm.listComponentAgents({ cwd });
  const agents = result.manifest.agents;
  return {
    paths: buildComponentAgentPathMap(environmentId, agents),
    launchTarget: pickPrimaryComponentAgentLaunchTarget(agents),
  };
}
