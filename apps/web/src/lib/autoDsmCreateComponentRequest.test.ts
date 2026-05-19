import { describe, expect, it } from "vitest";

import {
  inferComponentBaseName,
  inferCreateComponentMetadata,
  resolveUniqueComponentPath,
} from "./autoDsmCreateComponentRequest";

describe("inferComponentBaseName", () => {
  it("extracts a PascalCase name from create/build phrasing", () => {
    expect(inferComponentBaseName("Create a primary button with hover states")).toBe(
      "PrimaryButton",
    );
    expect(inferComponentBaseName("Build a card component with image and title")).toBe("Card");
  });

  it("falls back to NewComponent for empty prompts", () => {
    expect(inferComponentBaseName("   ")).toBe("NewComponent");
  });
});

describe("resolveUniqueComponentPath", () => {
  it("suffixes colliding paths with 2, 3, …", () => {
    const first = resolveUniqueComponentPath("PrimaryButton", []);
    expect(first.componentPath).toBe("src/components/PrimaryButton.tsx");

    const second = resolveUniqueComponentPath("PrimaryButton", [first.componentPath]);
    expect(second.componentPath).toBe("src/components/PrimaryButton2.tsx");

    const third = resolveUniqueComponentPath("PrimaryButton", [
      first.componentPath,
      second.componentPath,
    ]);
    expect(third.componentPath).toBe("src/components/PrimaryButton3.tsx");
  });

  it("normalizes leading slashes on existing paths", () => {
    const resolved = resolveUniqueComponentPath("BadgeRow", ["/src/components/BadgeRow.tsx"]);
    expect(resolved.componentPath).toBe("src/components/BadgeRow2.tsx");
  });
});

describe("inferCreateComponentMetadata", () => {
  it("returns display title, file name, and catalog path", () => {
    const metadata = inferCreateComponentMetadata("Design a form input with validation", []);
    expect(metadata.componentFileName).toBe("FormInput.tsx");
    expect(metadata.componentPath).toBe("src/components/FormInput.tsx");
    expect(metadata.title).toBe("Form Input");
  });
});
