import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("~/hooks/useAutoDsmWorkspace", () => ({
  useAutoDsmWorkspace: () => ({
    cwd: "/tmp/system",
    environmentId: "env-1",
    projectId: "proj-1",
    projectName: "Demo System",
  }),
}));

vi.mock("~/hooks/useAutoDsmCreateComponent", () => ({
  useAutoDsmCreateComponent: () => ({
    isSubmitting: false,
    submitCreateComponent: vi.fn(),
  }),
}));

vi.mock("~/hooks/useSettings", () => ({
  useSettings: () => ({
    textGenerationModelSelection: {
      instanceId: "codex:default",
      model: "gpt-5",
      options: [],
    },
  }),
  useUpdateSettings: () => ({
    updateSettings: vi.fn(),
    resetSettings: vi.fn(),
  }),
}));

vi.mock("~/modelSelection", () => ({
  resolveAppModelSelectionState: () => ({
    instanceId: "codex:default",
    model: "gpt-5",
    options: [],
  }),
  getCustomModelOptionsByInstance: () => new Map(),
}));

vi.mock("~/components/ComposerPromptEditor", () => ({
  ComposerPromptEditor: () => <textarea data-testid="create-component-prompt" />,
}));

import { AutoDsmCreateComponentWorkspace } from "./AutoDsmCreateComponentWorkspace";

describe("AutoDsmCreateComponentWorkspace", () => {
  it("renders the heading, composer shell, and suggested prompts", () => {
    const html = renderToStaticMarkup(<AutoDsmCreateComponentWorkspace />);

    expect(html).toContain("Build a component for");
    expect(html).toContain("Demo System");
    expect(html).toContain("data-composer-prompt-footer");
    expect(html).toContain("Suggested prompts");
    expect(html).toContain("Create a primary button with hover and disabled states");
    expect(html).toContain('aria-label="Create component"');
    expect(html).toContain('disabled=""');
  });
});
