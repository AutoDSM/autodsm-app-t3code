import { describe, expect, it } from "vitest";

import type { AutoDsmProjectProfile } from "@t3tools/contracts";

import {
  formatCommaList,
  formatPackageManagerLabel,
  formatProjectProfileStatus,
  pickDisplayPackageVersions,
} from "~/lib/projectFolderSettingsFormat";

describe("projectFolderSettingsFormat", () => {
  it("pickDisplayPackageVersions preserves configured key order", () => {
    const versions: Record<string, string> = {
      zustand: "5.0.0",
      react: "19.0.0",
      "react-dom": "19.0.0",
      next: "15.0.0",
    };
    const picked = pickDisplayPackageVersions(versions);
    expect(picked.map((p) => p.name)).toEqual(["react", "react-dom", "next", "zustand"]);
  });

  it("formatPackageManagerLabel maps unknown", () => {
    expect(formatPackageManagerLabel("bun")).toBe("bun");
    expect(formatPackageManagerLabel("unknown")).toBe("Unknown");
  });

  it("formatProjectProfileStatus covers literals", () => {
    expect(formatProjectProfileStatus("ready")).toBe("Ready");
    expect(formatProjectProfileStatus("not_started")).toBe("Not started");
  });

  it("formatCommaList uses empty label", () => {
    expect(formatCommaList([], "empty")).toBe("empty");
    expect(formatCommaList(["a", "b"])).toBe("a, b");
  });

  it("uses minimal contract-shaped profile for typings", () => {
    const profile: AutoDsmProjectProfile = {
      meta: {
        kind: "project-profile",
        schemaVersion: 1,
        owner: "project-profile-indexer",
        invalidationKey: "k",
        consumers: [],
      },
      workspaceRootFingerprint: "fp",
      packageManager: "pnpm",
      frameworks: ["react", "vite"],
      monorepoWorkspacePatterns: [],
      typescriptProjectHints: ["tsconfig.json"],
      tailwindHintPaths: ["/tailwind.config.ts"],
      componentRoots: ["/src/components"],
      packageVersions: { react: "^18.0.0" },
      status: "indexing",
    };
    expect(formatProjectProfileStatus(profile.status)).toBe("Indexing");
    expect(pickDisplayPackageVersions(profile.packageVersions)).toEqual([
      { name: "react", version: "^18.0.0" },
    ]);
  });
});
