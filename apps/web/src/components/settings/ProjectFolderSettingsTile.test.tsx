import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { AutoDsmProjectProfile } from "@t3tools/contracts";

import { ProjectFolderTechStackDetails } from "~/components/settings/ProjectFolderSettingsTile";

function sampleProfile(overrides: Partial<AutoDsmProjectProfile> = {}): AutoDsmProjectProfile {
  return {
    meta: {
      kind: "project-profile",
      schemaVersion: 1,
      owner: "project-profile-indexer",
      invalidationKey: "inv",
      consumers: [],
    },
    workspaceRootFingerprint: "fp",
    packageManager: "bun",
    frameworks: ["react", "next"],
    monorepoWorkspacePatterns: [],
    typescriptProjectHints: ["tsconfig.json"],
    tailwindHintPaths: ["/tailwind.config.ts"],
    componentRoots: ["/src/components"],
    packageVersions: {
      react: "19.0.0",
      next: "15.1.0",
      typescript: "5.7.0",
    },
    status: "ready",
    ...overrides,
  };
}

describe("ProjectFolderTechStackDetails", () => {
  it("renders framework badges and key dependency versions", () => {
    const html = renderToStaticMarkup(<ProjectFolderTechStackDetails profile={sampleProfile()} />);
    expect(html).toContain('data-testid="project-folder-tech-stack"');
    expect(html).toContain("react");
    expect(html).toContain("next");
    expect(html).toContain("19.0.0");
    expect(html).toContain("Package manager");
    expect(html).toContain("bun");
  });

  it("shows none detected when frameworks array is empty", () => {
    const html = renderToStaticMarkup(
      <ProjectFolderTechStackDetails profile={sampleProfile({ frameworks: [] })} />,
    );
    expect(html).toContain("None detected");
  });
});
