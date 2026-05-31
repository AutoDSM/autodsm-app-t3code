// @effect-diagnostics nodeBuiltinImport:off
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { AutoDsmComponentId, ThreadId } from "@t3tools/contracts";
import { describe, expect, it } from "vitest";

import {
  dedupeComponentAgentsByPath,
  loadComponentAgentsManifest,
  registerComponentAgent,
  removeComponentAgent,
  resyncComponentAgentsFromTemplate,
  seedComponentAgentsManifest,
  updateComponentAgent,
  writeComponentAgentsManifest,
} from "./componentAgentStore.ts";

function makeSystemCwd(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "autodsm-agents-"));
  const systemDir = path.join(root, "system");
  fs.mkdirSync(systemDir, { recursive: true });
  fs.writeFileSync(path.join(root, "meta.json"), JSON.stringify({ workspaceId: "workspace-test" }));
  return systemDir;
}

describe("componentAgentStore", () => {
  it("seeds starter agents and registers user agents", () => {
    const cwd = makeSystemCwd();
    const threadId = "11111111-1111-4111-8111-111111111111" as ThreadId;

    seedComponentAgentsManifest({
      cwd,
      agents: [
        {
          threadId,
          title: "Button",
          componentPath: "/src/components/Button.tsx",
          source: "starter",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    });

    const seeded = loadComponentAgentsManifest(cwd);
    expect(seeded.agents).toHaveLength(1);
    expect(seeded.agents[0]?.source).toBe("starter");

    const userThreadId = "22222222-2222-4222-8222-222222222222" as ThreadId;
    const registered = registerComponentAgent({
      cwd,
      threadId: userThreadId,
      title: "Primary Button",
      componentPath: "src/components/PrimaryButton.tsx",
      source: "user",
      status: "creating",
    });
    expect(registered.agent.status).toBe("creating");
    expect(registered.session.threadId).toBe(userThreadId);

    const updated = updateComponentAgent({
      cwd,
      threadId: userThreadId,
      status: "active",
      componentId: AutoDsmComponentId.make("cmp-primary-button"),
    });
    expect(updated.status).toBe("active");
    expect(updated.componentId).toBe("cmp-primary-button");
  });

  it("dedupes legacy variant agents by componentPath on load", () => {
    const cwd = makeSystemCwd();
    const baseThreadId = "33333333-3333-4333-8333-333333333333" as ThreadId;
    const outlineThreadId = "44444444-4444-4444-8444-444444444444" as ThreadId;
    const userThreadId = "55555555-5555-4555-8555-555555555555" as ThreadId;

    writeComponentAgentsManifest(cwd, {
      schemaVersion: 1,
      workspaceId: "workspace-test",
      agents: [
        {
          threadId: baseThreadId,
          sessionId: "sess-base" as never,
          title: "Button",
          componentPath: "/src/components/ShadcnButton.tsx",
          exportName: "ShadcnButton",
          status: "active",
          source: "starter",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
        {
          threadId: outlineThreadId,
          sessionId: "sess-outline" as never,
          title: "Button outline",
          componentPath: "/src/components/ShadcnButton.tsx",
          exportName: "ShadcnButtonOutline",
          status: "active",
          source: "starter",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    });

    const loaded = loadComponentAgentsManifest(cwd);
    expect(loaded.agents).toHaveLength(1);
    expect(loaded.agents[0]?.exportName).toBe("ShadcnButton");

    const registered = registerComponentAgent({
      cwd,
      threadId: userThreadId,
      title: "Custom variant",
      componentPath: "/src/components/ShadcnButton.tsx",
      exportName: "ShadcnButtonGhost",
      source: "user",
    });
    expect(registered.agent.exportName).toBe("ShadcnButtonGhost");
  });

  it("dedupeComponentAgentsByPath keeps the primary export agent", () => {
    const deduped = dedupeComponentAgentsByPath([
      {
        threadId: "a" as ThreadId,
        sessionId: "sess-a" as never,
        title: "Button outline",
        componentPath: "/src/components/ShadcnButton.tsx",
        exportName: "ShadcnButtonOutline",
        status: "active",
        source: "starter",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      {
        threadId: "b" as ThreadId,
        sessionId: "sess-b" as never,
        title: "Button",
        componentPath: "/src/components/ShadcnButton.tsx",
        exportName: "ShadcnButton",
        status: "active",
        source: "starter",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ]);
    expect(deduped).toHaveLength(1);
    expect(deduped[0]?.exportName).toBe("ShadcnButton");
  });

  it("removes a component agent by thread id", () => {
    const cwd = makeSystemCwd();
    const threadId = "11111111-1111-4111-8111-111111111111" as ThreadId;

    seedComponentAgentsManifest({
      cwd,
      agents: [
        {
          threadId,
          title: "Button",
          componentPath: "/src/components/Button.tsx",
          source: "starter",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    });

    expect(removeComponentAgent({ cwd, threadId })).toEqual({ removed: true });
    expect(loadComponentAgentsManifest(cwd).agents).toHaveLength(0);
    expect(removeComponentAgent({ cwd, threadId })).toEqual({ removed: false });
  });

  describe("resyncComponentAgentsFromTemplate", () => {
    function makeResyncFixture() {
      // Build the fake user workspace: meta.json must record a valid
      // starterId so the resync can locate the matching template dir.
      const root = fs.mkdtempSync(path.join(os.tmpdir(), "autodsm-resync-"));
      const systemDir = path.join(root, "system");
      fs.mkdirSync(systemDir, { recursive: true });
      fs.writeFileSync(
        path.join(root, "meta.json"),
        JSON.stringify({ workspaceId: "ws-resync", starterId: "shadcn-ui" }),
      );
      fs.mkdirSync(path.join(systemDir, "src", "components"), { recursive: true });

      // Build the fake templates root with a single-starter template.
      const templatesDir = fs.mkdtempSync(path.join(os.tmpdir(), "autodsm-templates-"));
      const templateStarterDir = path.join(templatesDir, "shadcn-ui");
      const templateComponentsDir = path.join(templateStarterDir, "src", "components");
      fs.mkdirSync(templateComponentsDir, { recursive: true });
      return { root, systemDir, templatesDir, templateStarterDir, templateComponentsDir };
    }

    function writeTemplateComponent(
      templateComponentsDir: string,
      filename: string,
      body: string,
    ): void {
      fs.writeFileSync(path.join(templateComponentsDir, filename), body, "utf8");
    }

    function writeTemplateOverlay(
      templateStarterDir: string,
      agents: ReadonlyArray<Record<string, string>>,
    ): void {
      fs.writeFileSync(
        path.join(templateStarterDir, "component-agents.json"),
        JSON.stringify({ agents }, null, 2),
      );
    }

    it("preserves user agents and replaces starter agents (default mode)", () => {
      const { systemDir, templatesDir, templateStarterDir, templateComponentsDir } =
        makeResyncFixture();

      // Seed an OLD workspace state: one starter agent + one user agent.
      const oldStarterThreadId = "aaaa1111-1111-4111-8111-111111111111" as ThreadId;
      const userThreadId = "bbbb2222-2222-4222-8222-222222222222" as ThreadId;
      seedComponentAgentsManifest({
        cwd: systemDir,
        agents: [
          {
            threadId: oldStarterThreadId,
            title: "Old Button",
            componentPath: "/src/components/ShadcnButton.tsx",
            source: "starter",
            createdAt: "2026-01-01T00:00:00.000Z",
          },
        ],
      });
      registerComponentAgent({
        cwd: systemDir,
        threadId: userThreadId,
        title: "My custom thing",
        componentPath: "/src/components/UserThing.tsx",
        source: "user",
      });

      // Template now has EXPANDED to 3 wrapper files with 4 named exports.
      writeTemplateComponent(
        templateComponentsDir,
        "ShadcnButton.tsx",
        [
          `export function ShadcnButton() { return null; }`,
          `export const ShadcnButtonOutline = () => null;`,
        ].join("\n"),
      );
      writeTemplateComponent(
        templateComponentsDir,
        "ShadcnDialog.tsx",
        `export function ShadcnDialog() { return null; }`,
      );
      writeTemplateComponent(
        templateComponentsDir,
        "ShadcnCard.tsx",
        `export function ShadcnCard() { return null; }`,
      );
      writeTemplateOverlay(templateStarterDir, [
        {
          title: "Primary button",
          componentPath: "/src/components/ShadcnButton.tsx",
          exportName: "ShadcnButton",
          group: "Buttons",
        },
        {
          title: "Outline button",
          componentPath: "/src/components/ShadcnButton.tsx",
          exportName: "ShadcnButtonOutline",
          group: "Buttons",
        },
        {
          title: "Modal dialog",
          componentPath: "/src/components/ShadcnDialog.tsx",
          group: "Overlays",
        },
        {
          title: "Surface card",
          componentPath: "/src/components/ShadcnCard.tsx",
          group: "Cards",
        },
      ]);

      const result = resyncComponentAgentsFromTemplate({
        cwd: systemDir,
        templatesDir,
      });

      expect(result.starterAgentsAdded).toBe(3);
      expect(result.starterAgentsRemoved).toBe(1);
      expect(result.userAgentsPreserved).toBe(1);

      const seeded = loadComponentAgentsManifest(systemDir);
      // 3 starter + 1 user = 4 total
      expect(seeded.agents).toHaveLength(4);

      const userSurvived = seeded.agents.find((a) => a.source === "user");
      expect(userSurvived?.threadId).toBe(userThreadId);
      expect(userSurvived?.title).toBe("My custom thing");

      // Old starter agent's threadId is NOT present — starters are rebuilt fresh.
      expect(seeded.agents.find((a) => a.threadId === oldStarterThreadId)).toBeUndefined();

      const buttonAgent = seeded.agents.find(
        (a) => a.componentPath === "/src/components/ShadcnButton.tsx",
      );
      expect(buttonAgent?.exportName).toBe("ShadcnButton");
      expect(buttonAgent?.title).toBe("Primary button");

      // Template files were copied into the workspace's src/components tree
      // so the preview iframe can actually import them.
      expect(fs.existsSync(path.join(systemDir, "src", "components", "ShadcnButton.tsx"))).toBe(
        true,
      );
      expect(fs.existsSync(path.join(systemDir, "src", "components", "ShadcnDialog.tsx"))).toBe(
        true,
      );
      expect(fs.existsSync(path.join(systemDir, "src", "components", "ShadcnCard.tsx"))).toBe(true);
    });

    it("overwrite-all mode drops user agents too", () => {
      const { systemDir, templatesDir, templateStarterDir, templateComponentsDir } =
        makeResyncFixture();
      const userThreadId = "cccc3333-3333-4333-8333-333333333333" as ThreadId;
      registerComponentAgent({
        cwd: systemDir,
        threadId: userThreadId,
        title: "Goner",
        componentPath: "/src/components/Goner.tsx",
        source: "user",
      });

      writeTemplateComponent(
        templateComponentsDir,
        "ShadcnCard.tsx",
        `export function ShadcnCard() { return null; }`,
      );
      writeTemplateOverlay(templateStarterDir, [
        { title: "Card", componentPath: "/src/components/ShadcnCard.tsx", group: "Cards" },
      ]);

      const result = resyncComponentAgentsFromTemplate({
        cwd: systemDir,
        templatesDir,
        mode: "overwrite-all",
      });

      expect(result.userAgentsPreserved).toBe(0);
      const seeded = loadComponentAgentsManifest(systemDir);
      expect(seeded.agents).toHaveLength(1);
      expect(seeded.agents[0]?.source).toBe("starter");
    });

    it("does not overwrite a user-modified wrapper file on the workspace side", () => {
      const { systemDir, templatesDir, templateStarterDir, templateComponentsDir } =
        makeResyncFixture();

      // User has a customized version of ShadcnButton.tsx on their workspace.
      const workspaceWrapperPath = path.join(systemDir, "src", "components", "ShadcnButton.tsx");
      const userVersion = `// USER-CUSTOMIZED\nexport function ShadcnButton() { return null; }`;
      fs.writeFileSync(workspaceWrapperPath, userVersion, "utf8");

      // Template has a NEW version of the same file.
      writeTemplateComponent(
        templateComponentsDir,
        "ShadcnButton.tsx",
        `// TEMPLATE VERSION\nexport function ShadcnButton() { return null; }`,
      );
      writeTemplateOverlay(templateStarterDir, [
        { title: "Button", componentPath: "/src/components/ShadcnButton.tsx", group: "Buttons" },
      ]);

      resyncComponentAgentsFromTemplate({ cwd: systemDir, templatesDir });

      // The user's wrapper survived; we never overwrite an existing file.
      const onDisk = fs.readFileSync(workspaceWrapperPath, "utf8");
      expect(onDisk).toBe(userVersion);
    });

    it("fails clearly when meta.json is missing or starterId is invalid", () => {
      const root = fs.mkdtempSync(path.join(os.tmpdir(), "autodsm-resync-bad-"));
      const systemDir = path.join(root, "system");
      fs.mkdirSync(systemDir, { recursive: true });
      // No meta.json on purpose.

      expect(() =>
        resyncComponentAgentsFromTemplate({
          cwd: systemDir,
          templatesDir: "/tmp/does-not-matter",
        }),
      ).toThrow(/starter id/i);
    });
  });
});
