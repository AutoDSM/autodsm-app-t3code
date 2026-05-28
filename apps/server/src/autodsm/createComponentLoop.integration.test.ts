// @effect-diagnostics nodeBuiltinImport:off
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { AutoDsmComponentId, ThreadId } from "@t3tools/contracts";
import { describe, expect, it } from "vitest";

import {
  findComponentAgentByThreadId,
  loadComponentAgentsManifest,
  reconcileComponentIdsFromRegistry,
  registerComponentAgent,
} from "./componentAgentStore.ts";
import { appendComponentConversation, loadComponentConversation } from "./conversationStore.ts";

/**
 * Verifies the *actual* Create-Component loop as it is implemented today —
 * the product renders previews through a custom esbuild/WebContentsView
 * bundler, NOT Storybook, so there is no `.stories.tsx` artifact in the loop.
 *
 * The contract this test pins:
 *   1. A scoped prompt registers a component agent in `creating` status.
 *   2. When the agent's component file lands and the registry re-indexes,
 *      `reconcileComponentIdsFromRegistry` flips the agent to `active` and
 *      stamps its `componentId` (driven on the web by the turn-settle
 *      registry invalidation in `invalidateComponentPreviewQueries`).
 *   3. The scoped conversation persists across the turn.
 */
function makeSystemCwd(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "autodsm-create-loop-"));
  const systemDir = path.join(root, "system");
  fs.mkdirSync(systemDir, { recursive: true });
  fs.writeFileSync(
    path.join(root, "meta.json"),
    JSON.stringify({ workspaceId: "workspace-create-loop" }),
  );
  return systemDir;
}

describe("create-component loop (real preview substrate)", () => {
  it("registers creating → reconciles to active + componentId when the file lands", () => {
    const cwd = makeSystemCwd();
    const threadId = "11111111-1111-4111-8111-111111111111" as ThreadId;
    const componentPath = "/src/components/PrimaryButton.tsx";

    // 1. Scoped prompt registers the agent in `creating`.
    const registered = registerComponentAgent({
      cwd,
      threadId,
      title: "Primary Button",
      componentPath,
      source: "user",
      status: "creating",
    });
    expect(registered.agent.status).toBe("creating");
    expect(registered.agent.componentId).toBeUndefined();

    // 2. The agent writes the file; the registry re-indexes it. The registry
    //    indexer calls reconcile on every `getComponentRegistry`.
    reconcileComponentIdsFromRegistry(cwd, [
      { componentId: AutoDsmComponentId.make("cmp-primary-button"), relativePath: componentPath },
    ]);

    const reconciled = findComponentAgentByThreadId(cwd, threadId);
    expect(reconciled?.status).toBe("active");
    expect(reconciled?.componentId).toBe("cmp-primary-button");
  });

  it("does not regress non-creating agents during reconcile", () => {
    const cwd = makeSystemCwd();
    const threadId = "22222222-2222-4222-8222-222222222222" as ThreadId;
    const componentPath = "/src/components/Card.tsx";
    registerComponentAgent({
      cwd,
      threadId,
      title: "Card",
      componentPath,
      source: "user",
      status: "active",
    });

    reconcileComponentIdsFromRegistry(cwd, [
      { componentId: AutoDsmComponentId.make("cmp-card"), relativePath: componentPath },
    ]);

    const agent = findComponentAgentByThreadId(cwd, threadId);
    expect(agent?.status).toBe("active");
    expect(agent?.componentId).toBe("cmp-card");
  });

  it("persists the scoped conversation across a turn", () => {
    const cwd = makeSystemCwd();
    const threadId = "33333333-3333-4333-8333-333333333333" as ThreadId;
    const componentPath = "/src/components/PrimaryButton.tsx";

    appendComponentConversation({
      cwd,
      componentPath,
      threadId,
      message: {
        role: "user",
        text: "Create a primary button with hover and disabled states",
        threadId,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    });
    appendComponentConversation({
      cwd,
      componentPath,
      threadId,
      componentId: AutoDsmComponentId.make("cmp-primary-button"),
      message: {
        role: "assistant",
        text: "Added PrimaryButton.tsx with hover and disabled variants.",
        threadId,
        createdAt: "2026-01-01T00:00:05.000Z",
      },
    });

    const conversation = loadComponentConversation(cwd, componentPath);
    expect(conversation?.messages).toHaveLength(2);
    expect(conversation?.messages[0]?.role).toBe("user");
    expect(conversation?.messages[1]?.role).toBe("assistant");
    expect(conversation?.threadIds).toEqual([threadId]);
    expect(conversation?.componentId).toBe("cmp-primary-button");
  });
});
