import type { AutoDsmComponentAgentRecord, EnvironmentId, ThreadId } from "@t3tools/contracts";
import { describe, expect, it, vi } from "vitest";

import {
  buildComponentAgentPathMap,
  fetchAutoDsmComponentAgentLaunch,
  pickPrimaryComponentAgentLaunchTarget,
} from "./autoDsmComponentAgentLaunch";

const ENV = "env-1" as EnvironmentId;

function agent(threadId: string, componentPath: string): AutoDsmComponentAgentRecord {
  return {
    threadId: threadId as ThreadId,
    sessionId: "session-1" as AutoDsmComponentAgentRecord["sessionId"],
    componentPath,
    title: componentPath.split("/").pop()?.replace(".tsx", "") ?? "Component",
    status: "active",
    source: "starter",
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("autoDsmComponentAgentLaunch", () => {
  it("builds scoped thread path map from agent records", () => {
    const paths = buildComponentAgentPathMap(ENV, [
      agent("thr-badge", "src/components/ui/badge.tsx"),
      agent("thr-button", "src/components/ui/button.tsx"),
    ]);

    expect(paths).toEqual({
      "env-1:thr-badge": "src/components/ui/badge.tsx",
      "env-1:thr-button": "src/components/ui/button.tsx",
    });
  });

  it("picks the first agent with a normalized component path", () => {
    expect(
      pickPrimaryComponentAgentLaunchTarget([
        agent("thr-badge", "src/components/ui/badge.tsx"),
        agent("thr-button", "src/components/ui/button.tsx"),
      ]),
    ).toEqual({
      threadId: "thr-badge" as ThreadId,
      componentPath: "src/components/ui/badge.tsx",
    });
  });

  it("returns null when no agents exist", () => {
    expect(pickPrimaryComponentAgentLaunchTarget([])).toBeNull();
  });

  it("fetches agents and returns launch metadata", async () => {
    const listComponentAgents = vi.fn(async () => ({
      manifest: {
        agents: [
          agent("thr-badge", "src/components/ui/badge.tsx"),
          agent("thr-button", "src/components/ui/button.tsx"),
        ],
      },
    }));

    const result = await fetchAutoDsmComponentAgentLaunch(
      { autodsm: { listComponentAgents } } as never,
      "/tmp/acme/system",
      ENV,
    );

    expect(listComponentAgents).toHaveBeenCalledWith({ cwd: "/tmp/acme/system" });
    expect(result.launchTarget).toEqual({
      threadId: "thr-badge" as ThreadId,
      componentPath: "src/components/ui/badge.tsx",
    });
    expect(result.paths["env-1:thr-button"]).toBe("src/components/ui/button.tsx");
  });
});
