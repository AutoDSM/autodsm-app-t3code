// @effect-diagnostics nodeBuiltinImport:off
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { describe, expect, it } from "vitest";

import { scanTemplateComponentAgents } from "./componentAgentScanner.ts";

function makeSystemDir(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "autodsm-scanner-"));
  const systemDir = path.join(root, "system");
  fs.mkdirSync(path.join(systemDir, "src", "components"), { recursive: true });
  return systemDir;
}

function writeComponent(systemDir: string, rel: string, body: string): void {
  const abs = path.join(systemDir, "src", "components", rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, body, "utf8");
}

const DEFAULT_EXPORT_BODY = `export default function Component() { return null; }`;

describe("componentAgentScanner", () => {
  it("discovers flat .tsx components and derives titles by stripping starter prefix", () => {
    const systemDir = makeSystemDir();
    writeComponent(systemDir, "ShadcnButton.tsx", DEFAULT_EXPORT_BODY);
    writeComponent(systemDir, "ShadcnAlert.tsx", DEFAULT_EXPORT_BODY);
    writeComponent(systemDir, "PillLabel.tsx", DEFAULT_EXPORT_BODY);

    const out = scanTemplateComponentAgents({ systemDir, starterId: "shadcn-ui" });

    expect(out.map((a) => a.title).toSorted()).toEqual(["Alert", "Button", "Pill Label"]);
    expect(out.map((a) => a.componentPath).toSorted()).toEqual([
      "/src/components/PillLabel.tsx",
      "/src/components/ShadcnAlert.tsx",
      "/src/components/ShadcnButton.tsx",
    ]);
    expect(out.every((a) => a.group === undefined)).toBe(true);
  });

  it("treats first-level directories as Atomic Design groups", () => {
    const systemDir = makeSystemDir();
    writeComponent(systemDir, "atoms/Label.tsx", DEFAULT_EXPORT_BODY);
    writeComponent(systemDir, "molecules/Alert.tsx", DEFAULT_EXPORT_BODY);
    writeComponent(systemDir, "organisms/NavBar.tsx", DEFAULT_EXPORT_BODY);

    const out = scanTemplateComponentAgents({ systemDir, starterId: "modern-starter" });
    const byTitle = new Map(out.map((a) => [a.title, a]));
    expect(byTitle.get("Label")?.group).toBe("Atoms");
    expect(byTitle.get("Alert")?.group).toBe("Molecules");
    expect(byTitle.get("Nav Bar")?.group).toBe("Organisms");
  });

  it("skips test, story, and hidden files", () => {
    const systemDir = makeSystemDir();
    writeComponent(systemDir, "Button.tsx", DEFAULT_EXPORT_BODY);
    writeComponent(systemDir, "Button.test.tsx", DEFAULT_EXPORT_BODY);
    writeComponent(systemDir, "Button.stories.tsx", DEFAULT_EXPORT_BODY);
    writeComponent(systemDir, "_internal.tsx", DEFAULT_EXPORT_BODY);

    const out = scanTemplateComponentAgents({ systemDir, starterId: "modern-starter" });
    expect(out.map((a) => a.componentPath)).toEqual(["/src/components/Button.tsx"]);
  });

  it("skips files without a recognizable component export", () => {
    const systemDir = makeSystemDir();
    writeComponent(systemDir, "GoodComponent.tsx", DEFAULT_EXPORT_BODY);
    writeComponent(systemDir, "JustUtils.tsx", `export const useUtil = () => null;`);

    const out = scanTemplateComponentAgents({ systemDir, starterId: "modern-starter" });
    expect(out.map((a) => a.componentPath)).toEqual(["/src/components/GoodComponent.tsx"]);
  });

  it("skips Typography wrappers (lives in Design Tokens instead)", () => {
    const systemDir = makeSystemDir();
    writeComponent(systemDir, "Button.tsx", DEFAULT_EXPORT_BODY);
    writeComponent(systemDir, "Typography.tsx", DEFAULT_EXPORT_BODY);
    writeComponent(systemDir, "ShadcnTypography.tsx", DEFAULT_EXPORT_BODY);
    writeComponent(systemDir, "MuiTypography.tsx", DEFAULT_EXPORT_BODY);
    writeComponent(systemDir, "TwTypography.tsx", DEFAULT_EXPORT_BODY);

    const out = scanTemplateComponentAgents({ systemDir, starterId: "shadcn-ui" });
    const paths = out.map((a) => a.componentPath);
    expect(paths).toEqual(["/src/components/Button.tsx"]);
    expect(paths.some((p) => /Typography/i.test(p))).toBe(false);
  });

  it("applies overlay title and group overrides by componentPath", () => {
    const systemDir = makeSystemDir();
    writeComponent(systemDir, "ShadcnButton.tsx", DEFAULT_EXPORT_BODY);
    writeComponent(systemDir, "ShadcnAlert.tsx", DEFAULT_EXPORT_BODY);

    const out = scanTemplateComponentAgents({
      systemDir,
      starterId: "shadcn-ui",
      overlay: {
        agents: [
          {
            title: "Primary button",
            componentPath: "/src/components/ShadcnButton.tsx",
            group: "Buttons",
          },
        ],
      },
    });

    const button = out.find((a) => a.componentPath === "/src/components/ShadcnButton.tsx");
    const alert = out.find((a) => a.componentPath === "/src/components/ShadcnAlert.tsx");
    expect(button?.title).toBe("Primary button");
    expect(button?.group).toBe("Buttons");
    expect(alert?.title).toBe("Alert");
    expect(alert?.group).toBeUndefined();
  });

  it("emits overlay-only entries even when the file is missing", () => {
    const systemDir = makeSystemDir();
    writeComponent(systemDir, "ShadcnButton.tsx", DEFAULT_EXPORT_BODY);

    const out = scanTemplateComponentAgents({
      systemDir,
      starterId: "shadcn-ui",
      overlay: {
        agents: [
          {
            title: "Coming soon",
            componentPath: "/src/components/ShadcnFutureWidget.tsx",
            group: "Roadmap",
          },
        ],
      },
    });

    const future = out.find((a) => a.componentPath === "/src/components/ShadcnFutureWidget.tsx");
    expect(future).toBeDefined();
    expect(future?.title).toBe("Coming soon");
    expect(future?.group).toBe("Roadmap");
  });

  it("returns an empty list when components directory is absent", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "autodsm-scanner-empty-"));
    const systemDir = path.join(root, "system");
    fs.mkdirSync(systemDir, { recursive: true });

    const out = scanTemplateComponentAgents({ systemDir, starterId: "modern-starter" });
    expect(out).toEqual([]);
  });

  it("emits one agent per file when multiple PascalCase named exports exist", () => {
    const systemDir = makeSystemDir();
    writeComponent(
      systemDir,
      "ShadcnButton.tsx",
      [
        `export function ShadcnButton() { return null; }`,
        `export const ShadcnButtonOutline = () => null;`,
        `export const ShadcnButtonGhost = () => null;`,
      ].join("\n"),
    );

    const out = scanTemplateComponentAgents({ systemDir, starterId: "shadcn-ui" });

    expect(out).toHaveLength(1);
    expect(out[0]?.title).toBe("Button");
    expect(out[0]?.exportName).toBe("ShadcnButton");
    expect(out[0]?.componentPath).toBe("/src/components/ShadcnButton.tsx");
  });

  it("keeps single-export files as one agent with no exportName (back-compat)", () => {
    const systemDir = makeSystemDir();
    writeComponent(
      systemDir,
      "ShadcnDialog.tsx",
      `export function ShadcnDialog() { return null; }`,
    );

    const out = scanTemplateComponentAgents({ systemDir, starterId: "shadcn-ui" });

    expect(out).toHaveLength(1);
    expect(out[0]?.exportName).toBeUndefined();
    expect(out[0]?.title).toBe("Dialog");
  });

  it("applies overlay overrides per componentPath (prefers file-level rows)", () => {
    const systemDir = makeSystemDir();
    writeComponent(
      systemDir,
      "ShadcnButton.tsx",
      [
        `export function ShadcnButton() { return null; }`,
        `export const ShadcnButtonOutline = () => null;`,
      ].join("\n"),
    );

    const out = scanTemplateComponentAgents({
      systemDir,
      starterId: "shadcn-ui",
      overlay: {
        agents: [
          {
            title: "Primary",
            componentPath: "/src/components/ShadcnButton.tsx",
            exportName: "ShadcnButton",
            group: "Buttons",
          },
          {
            title: "Outline · legacy",
            componentPath: "/src/components/ShadcnButton.tsx",
            exportName: "ShadcnButtonOutline",
            group: "Buttons",
          },
        ],
      },
    });

    expect(out).toHaveLength(1);
    expect(out[0]?.title).toBe("Primary");
    expect(out[0]?.group).toBe("Buttons");
    expect(out[0]?.exportName).toBe("ShadcnButton");
  });

  it("an overlay entry without exportName matches the file agent", () => {
    const systemDir = makeSystemDir();
    writeComponent(
      systemDir,
      "ShadcnDialog.tsx",
      `export function ShadcnDialog() { return null; }`,
    );
    writeComponent(
      systemDir,
      "ShadcnButton.tsx",
      [
        `export function ShadcnButton() { return null; }`,
        `export const ShadcnButtonOutline = () => null;`,
      ].join("\n"),
    );

    const out = scanTemplateComponentAgents({
      systemDir,
      starterId: "shadcn-ui",
      overlay: {
        agents: [
          { title: "Confirm dialog", componentPath: "/src/components/ShadcnDialog.tsx" },
          { title: "Button", componentPath: "/src/components/ShadcnButton.tsx", group: "Buttons" },
        ],
      },
    });

    const dialog = out.find((a) => a.componentPath === "/src/components/ShadcnDialog.tsx");
    expect(dialog?.title).toBe("Confirm dialog");

    const buttonAgents = out.filter((a) => a.componentPath === "/src/components/ShadcnButton.tsx");
    expect(buttonAgents).toHaveLength(1);
    expect(buttonAgents[0]?.title).toBe("Button");
    expect(buttonAgents[0]?.group).toBe("Buttons");
  });

  it("ignores legacy overlay-only variant rows when the file is absent", () => {
    const systemDir = makeSystemDir();
    writeComponent(
      systemDir,
      "ShadcnButton.tsx",
      `export function ShadcnButton() { return null; }`,
    );

    const out = scanTemplateComponentAgents({
      systemDir,
      starterId: "shadcn-ui",
      overlay: {
        agents: [
          {
            title: "Future destructive",
            componentPath: "/src/components/ShadcnButton.tsx",
            exportName: "ShadcnButtonDestructive",
            group: "Buttons",
          },
        ],
      },
    });

    expect(out.filter((a) => a.componentPath === "/src/components/ShadcnButton.tsx")).toHaveLength(
      1,
    );
    expect(out[0]?.exportName).toBeUndefined();
  });
});
