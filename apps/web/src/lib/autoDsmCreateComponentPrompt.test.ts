import type { ProviderDriverKind } from "@t3tools/contracts";
import { describe, expect, it } from "vitest";

import {
  buildAutoDsmCreateComponentPrompt,
  formatCreateComponentOutgoingPrompt,
} from "./autoDsmCreateComponentPrompt";

describe("buildAutoDsmCreateComponentPrompt", () => {
  it("includes the user request, target path, and create constraints", () => {
    const prompt = buildAutoDsmCreateComponentPrompt({
      userPrompt: "Create a primary button",
      componentPath: "src/components/PrimaryButton.tsx",
      starterId: "shadcn-ui",
    });

    expect(prompt).toContain("Create a primary button");
    expect(prompt).toContain("src/components/PrimaryButton.tsx");
    expect(prompt).toContain("Storybook story");
    expect(prompt).toContain("shadcn-ui");
    expect(prompt).toContain("Do not modify unrelated files");
  });
});

describe("formatCreateComponentOutgoingPrompt", () => {
  it("wraps the create prompt with provider effort formatting", () => {
    const formatted = formatCreateComponentOutgoingPrompt({
      provider: "codex" as ProviderDriverKind,
      model: "gpt-5",
      models: [],
      effort: null,
      userPrompt: "Build a badge row",
      componentPath: "src/components/BadgeRow.tsx",
    });

    expect(formatted).toContain("BadgeRow.tsx");
    expect(formatted).toContain("Build a badge row");
  });
});
