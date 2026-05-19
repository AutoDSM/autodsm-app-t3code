import {
  AutoDsmComponentId,
  AutoDsmRegistryEntryId,
  type AutoDsmComponentRegistry,
  type AutoDsmComponentRegistryEntry,
  type ProjectEntry,
} from "@t3tools/contracts";
import { describe, expect, it } from "vitest";

import { mergeSidebarComponentsCatalogViewModel } from "./srcComponentsCatalog.ts";

function entry(path: string): AutoDsmComponentRegistryEntry {
  const posix = path.startsWith("/") ? path.slice(1) : path;
  return {
    id: AutoDsmRegistryEntryId.make("registry-entry-test-id"),
    componentId: AutoDsmComponentId.make("registry-component-test-id"),
    relativePath: path,
    exports: [],
    propsByExport: {},
    providerHints: [],
    dependencyEdges: [],
    usageImports: {},
    manifest: {
      relativePath: posix,
      exports: [],
      propsByExport: [],
      diagnostics: [],
    },
  };
}

function registryShape(partial: {
  readonly entries: AutoDsmComponentRegistry["entries"];
  readonly status: AutoDsmComponentRegistry["status"];
  readonly gate?: AutoDsmComponentRegistry["gate"];
}): AutoDsmComponentRegistry {
  return {
    meta: {
      kind: "component-registry",
      schemaVersion: 1,
      owner: "component-registry-indexer",
      invalidationKey: "inv-test",
      consumers: ["workbench-ui"],
    },
    entries: partial.entries,
    status: partial.status,
    ...(partial.gate !== undefined && partial.gate !== null ? { gate: partial.gate } : {}),
  };
}

describe("mergeSidebarComponentsCatalogViewModel", () => {
  it("returns pending while registry is loading", () => {
    const vm = mergeSidebarComponentsCatalogViewModel({
      registry: undefined,
      registryPending: true,
      registryError: false,
      fallbackRankedEntries: undefined,
      fallbackQueryTruncated: undefined,
      fallbackPending: false,
      fallbackError: false,
    });
    expect(vm.isPending).toBe(true);
    expect(vm.paths).toEqual([]);
    expect(vm.gate).toBeNull();
  });

  it("surfaces workspace build gate without listing paths", () => {
    const vm = mergeSidebarComponentsCatalogViewModel({
      registry: registryShape({
        entries: [],
        status: "failed",
        gate: {
          code: "workspace_build_failed",
          summary: "Build failed",
          commandDisplay: "npm run build",
          stdoutTail: null,
          stderrTail: "error",
          exitCode: 1,
        },
      }),
      registryPending: false,
      registryError: false,
      fallbackRankedEntries: [
        { kind: "file", path: "/src/components/Fallback.tsx" } satisfies ProjectEntry,
      ],
      fallbackQueryTruncated: false,
      fallbackPending: false,
      fallbackError: false,
    });
    expect(vm.gate?.code).toBe("workspace_build_failed");
    expect(vm.paths).toEqual([]);
    expect(vm.isPending).toBe(false);
  });

  it("prefers registry paths normalized without leading slash", () => {
    const vm = mergeSidebarComponentsCatalogViewModel({
      registry: registryShape({
        entries: [entry("/src/components/Button.tsx")],
        status: "ready",
      }),
      registryPending: false,
      registryError: false,
      fallbackRankedEntries: undefined,
      fallbackQueryTruncated: undefined,
      fallbackPending: false,
      fallbackError: false,
    });
    expect(vm.paths).toContain("src/components/Button.tsx");
    expect(vm.gate).toBeNull();
  });

  it("falls back to search entries when registry is ready but empty", () => {
    const vm = mergeSidebarComponentsCatalogViewModel({
      registry: registryShape({ entries: [], status: "partial" }),
      registryPending: false,
      registryError: false,
      fallbackRankedEntries: [
        { kind: "file", path: "/src/components/Fallback.tsx" } satisfies ProjectEntry,
      ],
      fallbackQueryTruncated: false,
      fallbackPending: false,
      fallbackError: false,
    });
    expect(vm.paths).toContain("src/components/Fallback.tsx");
    expect(vm.gate).toBeNull();
  });
});
