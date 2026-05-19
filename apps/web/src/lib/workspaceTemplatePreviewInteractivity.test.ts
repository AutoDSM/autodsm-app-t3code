import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const here = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = path.resolve(here, "../../../..");
const templatesRoot = path.join(repoRoot, "apps/server/workspace-templates");

const COMPONENT_FILES = [
  "chakra-ui/src/components/ChakraBadgeRow.tsx",
  "chakra-ui/src/components/ChakraSolidButton.tsx",
  "modern-starter/src/components/ActionCard.tsx",
  "modern-starter/src/components/WelcomeShell.tsx",
  "mui/src/components/MuiChipRow.tsx",
  "mui/src/components/MuiPrimaryButton.tsx",
  "shadcn-ui/src/components/PillLabel.tsx",
  "shadcn-ui/src/components/ShadcnBadge.tsx",
  "shadcn-ui/src/components/ShadcnButton.tsx",
  "shadcn-ui/src/components/ShadcnCard.tsx",
  "shadcn-ui/src/components/ShadcnInput.tsx",
  "shadcn-ui/src/components/ThemeCard.tsx",
  "tailwind-css/src/components/GradientHeading.tsx",
  "tailwind-css/src/components/UtilityStrip.tsx",
] as const;

function readTemplate(relativePath: string): string {
  return fs.readFileSync(path.join(templatesRoot, relativePath), "utf8");
}

describe("workspace template preview interactivity", () => {
  it("does not ship readOnly on shadcn input demo", () => {
    const source = readTemplate("shadcn-ui/src/components/ShadcnInput.tsx");
    expect(source).not.toContain("readOnly");
    expect(source).toContain("preview-input");
  });

  it("uses design-token CSS variables in shadcn starter and preview classes elsewhere", () => {
    const shadcnButton = readTemplate("shadcn-ui/src/components/ShadcnButton.tsx");
    expect(shadcnButton).toContain("var(--primary)");
    expect(shadcnButton).not.toContain("preview-btn");
    expect(readTemplate("tailwind-css/src/components/UtilityStrip.tsx")).toContain("preview-strip");
  });

  it("wires MUI and Chakra previews through theme providers", () => {
    expect(readTemplate("mui/src/components/MuiPrimaryButton.tsx")).toContain("MuiPreviewShell");
    expect(readTemplate("mui/src/preview/MuiPreviewShell.tsx")).toContain("ThemeProvider");
    expect(readTemplate("chakra-ui/src/components/ChakraSolidButton.tsx")).toContain(
      "ChakraPreviewShell",
    );
    expect(readTemplate("chakra-ui/src/preview/ChakraPreviewShell.tsx")).toContain(
      "ChakraProvider",
    );
  });

  it("keeps interactive controls enabled by default across all template demos", () => {
    for (const relativePath of COMPONENT_FILES) {
      const source = readTemplate(relativePath);
      expect(source, relativePath).not.toMatch(/\bdisabled=\{true\}/);
      expect(source, relativePath).not.toMatch(/\bisDisabled=\{true\}/);
      expect(source, relativePath).not.toContain("readOnly");
    }
  });

  it("exposes props on components that accept customization", () => {
    const propComponents: ReadonlyArray<{ readonly file: string; readonly prop: string }> = [
      { file: "shadcn-ui/src/components/ShadcnButton.tsx", prop: "label" },
      { file: "shadcn-ui/src/components/ShadcnInput.tsx", prop: "placeholder" },
      { file: "shadcn-ui/src/components/ShadcnBadge.tsx", prop: "variant" },
      { file: "shadcn-ui/src/components/ShadcnCard.tsx", prop: "title" },
      { file: "mui/src/components/MuiPrimaryButton.tsx", prop: "variant" },
      { file: "chakra-ui/src/components/ChakraSolidButton.tsx", prop: "label" },
      { file: "tailwind-css/src/components/UtilityStrip.tsx", prop: "label" },
    ];

    for (const { file, prop } of propComponents) {
      expect(readTemplate(file), file).toContain(prop);
    }
  });

  it("uses native buttons or library click targets for press/focus states", () => {
    expect(readTemplate("modern-starter/src/components/ActionCard.tsx")).toContain('type="button"');
    expect(readTemplate("tailwind-css/src/components/UtilityStrip.tsx")).toContain('type="button"');
    expect(readTemplate("shadcn-ui/src/components/ShadcnCard.tsx")).toContain('type="button"');
    expect(readTemplate("mui/src/components/MuiChipRow.tsx")).toContain("clickable");
  });
});
