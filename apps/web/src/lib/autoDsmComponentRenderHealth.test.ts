import { describe, expect, it } from "vitest";

import type { AutoDsmComponentRegistryEntry } from "@t3tools/contracts";

import type { AutoDsmComponentAgentGroup } from "~/lib/autoDsmComponentAgentGroups";
import {
  buildGroupRenderHealth,
  buildRenderHealthByPath,
  componentRenderHealthStatus,
  resolveGroupRenderHealth,
} from "~/lib/autoDsmComponentRenderHealth";

function entry(relativePath: string, diagnostics: readonly string[]): AutoDsmComponentRegistryEntry {
  return {
    id: `entry:${relativePath}`,
    componentId: relativePath,
    relativePath,
    exports: [],
    propsByExport: {},
    providerHints: [],
    dependencyEdges: [],
    usageImports: {},
    manifest: {
      relativePath,
      exports: [],
      propsByExport: [],
      diagnostics: [...diagnostics],
    },
  } as unknown as AutoDsmComponentRegistryEntry;
}

function group(groupId: string, componentPaths: readonly string[]): AutoDsmComponentAgentGroup {
  return {
    groupId,
    label: groupId,
    tabs: componentPaths.map((componentPath, index) => ({
      threadRef: { kind: "test", id: `${groupId}-${index}` } as never,
      threadKey: `${groupId}-${index}`,
      title: componentPath,
      componentPath,
    })),
  };
}

describe("componentRenderHealthStatus", () => {
  it("is ok with no diagnostics and warning when diagnostics exist", () => {
    expect(componentRenderHealthStatus([])).toBe("ok");
    expect(componentRenderHealthStatus(["could not load source file"])).toBe("warning");
  });
});

describe("buildRenderHealthByPath", () => {
  it("maps normalized component paths to health with the first diagnostic", () => {
    const byPath = buildRenderHealthByPath([
      entry("src/components/ui/button.tsx", []),
      entry("src/components/ui/card.tsx", ["could not load module symbol", "extra"]),
    ]);
    const button = byPath.get("src/components/ui/button.tsx");
    const card = byPath.get("src/components/ui/card.tsx");
    expect(button?.status).toBe("ok");
    expect(card?.status).toBe("warning");
    expect(card?.diagnosticsCount).toBe(2);
    expect(card?.firstDiagnostic).toBe("could not load module symbol");
  });
});

describe("resolveGroupRenderHealth", () => {
  it("returns ok when every component in the group is healthy", () => {
    const byPath = buildRenderHealthByPath([entry("src/components/ui/button.tsx", [])]);
    const health = resolveGroupRenderHealth(group("Buttons", ["src/components/ui/button.tsx"]), byPath);
    expect(health.status).toBe("ok");
    expect(health.affectedCount).toBe(0);
    expect(health.firstDiagnostic).toBeNull();
  });

  it("counts affected components and surfaces the first diagnostic", () => {
    const byPath = buildRenderHealthByPath([
      entry("src/components/ui/button.tsx", []),
      entry("src/components/ui/icon-button.tsx", ["bad import"]),
      entry("src/components/ui/ghost-button.tsx", ["missing prop type"]),
    ]);
    const health = resolveGroupRenderHealth(
      group("Buttons", [
        "src/components/ui/button.tsx",
        "src/components/ui/icon-button.tsx",
        "src/components/ui/ghost-button.tsx",
      ]),
      byPath,
    );
    expect(health.status).toBe("warning");
    expect(health.affectedCount).toBe(2);
    expect(health.firstDiagnostic).toBe("bad import");
  });

  it("ignores components missing from the registry", () => {
    const byPath = buildRenderHealthByPath([entry("src/components/ui/button.tsx", ["x"])]);
    const health = resolveGroupRenderHealth(
      group("Buttons", ["src/components/ui/unknown.tsx"]),
      byPath,
    );
    expect(health.status).toBe("ok");
    expect(health.affectedCount).toBe(0);
  });
});

describe("buildGroupRenderHealth", () => {
  it("produces a per-group map keyed by groupId", () => {
    const byPath = buildRenderHealthByPath([
      entry("src/components/ui/button.tsx", []),
      entry("src/components/ui/card.tsx", ["broken"]),
    ]);
    const groups = [
      group("Buttons", ["src/components/ui/button.tsx"]),
      group("Cards", ["src/components/ui/card.tsx"]),
    ];
    const result = buildGroupRenderHealth(groups, byPath);
    expect(result.get("Buttons")?.status).toBe("ok");
    expect(result.get("Cards")?.status).toBe("warning");
    expect(result.get("Cards")?.affectedCount).toBe(1);
  });
});
