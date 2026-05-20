import { scopeThreadRef } from "@t3tools/client-runtime";
import type { EnvironmentId, ThreadId } from "@t3tools/contracts";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AutoDsmComponentAgentSidebarTree } from "./AutoDsmComponentAgentSidebarTree";
import type { AutoDsmComponentAgentTab } from "~/lib/autoDsmComponentAgents";
import {
  buildAutoDsmComponentAgentGroups,
  buildComponentAgentGroupLookup,
} from "~/lib/autoDsmComponentAgentGroups";
import { getStarterComponentAgents } from "~/lib/autoDsmStarterComponentAgents";
import { SidebarProvider } from "~/components/ui/sidebar";

const ENV = "env-1" as EnvironmentId;
const WORKSPACE = "/Users/me/.autodsm/systems/demo/system";

function tab(id: string, title: string, componentPath: string): AutoDsmComponentAgentTab {
  const threadRef = scopeThreadRef(ENV, id as ThreadId);
  return {
    threadRef,
    threadKey: `${ENV}:${id}`,
    title,
    componentPath,
  };
}

describe("AutoDsmComponentAgentSidebarTree", () => {
  it("renders grouped folders and component rows", () => {
    const starterAgents = getStarterComponentAgents("shadcn-ui");
    const lookup = buildComponentAgentGroupLookup(starterAgents);
    const tabs = starterAgents.map((agent, index) =>
      tab(`thr-${index}`, agent.title, agent.componentPath.replace(/^\//, "")),
    );
    const groups = buildAutoDsmComponentAgentGroups(tabs, lookup);

    const html = renderToStaticMarkup(
      <SidebarProvider>
        <AutoDsmComponentAgentSidebarTree
          workspaceKey={WORKSPACE}
          groups={groups}
          activeThreadRef={tabs[0]!.threadRef}
          onSelectTab={() => {}}
        />
      </SidebarProvider>,
    );

    expect(html).toContain('data-testid="autodsm-component-agent-sidebar-tree"');
    expect(html).toContain('data-testid="autodsm-component-agent-group:Buttons"');
    expect(html).toContain('data-testid="autodsm-component-agent-group:Cards"');
    expect(html).toContain("Button");
    expect(html).toContain("Theme card");
  });
});
