import { scopeThreadRef } from "@t3tools/client-runtime";
import type { EnvironmentId, ThreadId } from "@t3tools/contracts";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AutoDsmComponentAgentTabBar } from "./AutoDsmComponentAgentTabBar";
import type { AutoDsmComponentAgentTab } from "~/lib/autoDsmComponentAgents";
import { SidebarProvider } from "~/components/ui/sidebar";

const ENV = "env-1" as EnvironmentId;

function tab(id: string, title: string): AutoDsmComponentAgentTab {
  const threadRef = scopeThreadRef(ENV, id as ThreadId);
  return {
    threadRef,
    threadKey: `${ENV}:${id}`,
    title,
    componentPath: `src/components/${title}.tsx`,
  };
}

describe("AutoDsmComponentAgentTabBar", () => {
  it("renders one flat tab per agent and marks the active thread", () => {
    const tabs = [tab("thr-button", "Button"), tab("thr-card", "Card")];
    const html = renderToStaticMarkup(
      <AutoDsmComponentAgentTabBar
        tabs={tabs}
        activeThreadRef={tabs[0]!.threadRef}
        onSelectTab={() => {}}
      />,
    );

    expect(html).toContain('role="tablist"');
    expect((html.match(/role="tab"/g) ?? []).length).toBe(2);
    expect(html).toContain('data-autodsm="component-agent-tab"');
    expect(html).toContain('data-testid="autodsm-component-agent-tab:env-1:thr-button"');
    expect(html).toContain("Button");
    expect(html).toContain("Card");
    expect(html).toContain('aria-selected="true"');
    expect(html).not.toContain("Close component preview");
  });

  it("selects tab by activeComponentPath before activeThreadRef", () => {
    const tabs = [tab("thr-button", "Button"), tab("thr-badge", "Badge")];
    const html = renderToStaticMarkup(
      <AutoDsmComponentAgentTabBar
        tabs={tabs}
        activeThreadRef={tabs[0]!.threadRef}
        activeComponentPath="src/components/Badge.tsx"
        onSelectTab={() => {}}
      />,
    );

    expect(html).toContain('data-testid="autodsm-component-agent-tab:env-1:thr-badge"');
    expect(html).toMatch(
      /data-testid="autodsm-component-agent-tab:env-1:thr-badge"[^>]*aria-selected="true"/,
    );
  });

  it("returns null when there are no tabs", () => {
    const html = renderToStaticMarkup(
      <AutoDsmComponentAgentTabBar tabs={[]} activeThreadRef={null} onSelectTab={() => {}} />,
    );
    expect(html).toBe("");
  });

  it("renders one flat tab per shadcn starter component without folder grouping", () => {
    const tabs = [
      tab("thr-button", "Button"),
      tab("thr-card", "Card"),
      tab("thr-badge", "Badge"),
      tab("thr-input", "Input"),
      tab("thr-theme", "Theme card"),
      tab("thr-pill", "Pill label"),
    ];
    const html = renderToStaticMarkup(
      <AutoDsmComponentAgentTabBar
        tabs={tabs}
        activeThreadRef={tabs[0]!.threadRef}
        onSelectTab={() => {}}
      />,
    );

    expect(html).toContain('role="tablist"');
    expect((html.match(/role="tab"/g) ?? []).length).toBe(6);
    expect(html).not.toContain("SidebarGroupLabel");
    expect(html).not.toContain('data-sidebar="group-label"');
    for (const componentTab of tabs) {
      expect(html).toContain(componentTab.title);
    }
  });

  it("renders vertical sidebar layout with component agent tabs", () => {
    const tabs = [tab("thr-button", "Button"), tab("thr-card", "Card")];
    const html = renderToStaticMarkup(
      <SidebarProvider>
        <AutoDsmComponentAgentTabBar
          layout="sidebar"
          tabs={tabs}
          activeThreadRef={tabs[0]!.threadRef}
          onSelectTab={() => {}}
        />
      </SidebarProvider>,
    );

    expect(html).toContain('data-testid="autodsm-component-agent-sidebar"');
    expect(html).toContain('role="tablist"');
    expect(html).toContain("Button");
    expect(html).toContain("Card");
    expect(html).toContain('data-testid="autodsm-component-agent-tab:env-1:thr-button"');
  });

  it("supports embedded sidebar rows without an outer Components group", () => {
    const tabs = [tab("thr-button", "Button")];
    const html = renderToStaticMarkup(
      <SidebarProvider>
        <AutoDsmComponentAgentTabBar
          layout="sidebar-embedded"
          tabs={tabs}
          activeThreadRef={tabs[0]!.threadRef}
          onSelectTab={() => {}}
        />
      </SidebarProvider>,
    );

    expect(html).toContain('data-testid="autodsm-component-agent-tab-bar"');
    expect(html).not.toContain('data-testid="autodsm-component-agent-sidebar"');
    expect(html).toContain("Button");
  });
});
