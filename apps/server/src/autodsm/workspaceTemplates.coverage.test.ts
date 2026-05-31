// @effect-diagnostics nodeBuiltinImport:off
/**
 * Per-starter coverage + consistency sanity for the workspace-template
 * component sets. Catches two classes of bug at CI time:
 *
 * 1. Manifest ↔ wrapper drift — every `component-agents.json` entry must
 *    resolve to a real `.tsx` file. When the entry carries `exportName`
 *    that export must actually appear in the file. When the entry omits
 *    `exportName`, the file must have a single PascalCase / default export
 *    (legacy back-compat — overlay's no-exportName entries fall back to
 *    the file's default agent, which only makes sense for single-export
 *    files).
 *
 * 2. Server overlay ↔ web manifest drift — the onboarding "what's in the
 *    box" picker reads `apps/web/src/lib/starter-manifests/<id>.json`, and
 *    the workspace materializer reads the matching
 *    `apps/server/workspace-templates/<id>/component-agents.json`. The two
 *    MUST be byte-identical or a user picking a starter will see a
 *    different component set on the onboarding picker than they get in
 *    their workspace.
 *
 * @module workspaceTemplates.coverage.test
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";

interface AgentEntry {
  readonly title: string;
  readonly componentPath: string;
  readonly exportName?: string;
  readonly group?: string;
}

interface ManifestFile {
  readonly agents: ReadonlyArray<AgentEntry>;
}

// __dirname → `apps/server/src/autodsm` → 4 levels up reaches repo root.
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..", "..");
const TEMPLATES_ROOT = path.join(REPO_ROOT, "apps", "server", "workspace-templates");
const WEB_MANIFESTS_ROOT = path.join(REPO_ROOT, "apps", "web", "src", "lib", "starter-manifests");

interface StarterCoverageSpec {
  readonly id: string;
  readonly minAgents: number;
}

const STARTERS: ReadonlyArray<StarterCoverageSpec> = [
  { id: "shadcn-ui", minAgents: 45 },
  { id: "mui", minAgents: 45 },
  { id: "chakra-ui", minAgents: 55 },
  { id: "tailwind-css", minAgents: 45 },
  // modern-starter is intentionally minimal; floor reflects its scratch role.
  { id: "modern-starter", minAgents: 2 },
];

function readManifest(filePath: string): ManifestFile {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw) as ManifestFile;
}

function templateOverlayPath(starterId: string): string {
  return path.join(TEMPLATES_ROOT, starterId, "component-agents.json");
}

function webManifestPath(starterId: string): string {
  return path.join(WEB_MANIFESTS_ROOT, `${starterId}.json`);
}

function resolveComponentAbsPath(starterId: string, componentPath: string): string {
  const stripped = componentPath.replace(/^\/+/, "");
  return path.join(TEMPLATES_ROOT, starterId, stripped);
}

const PASCAL_EXPORT_RE = /\bexport\s+(?:function|const|class|let|var)\s+([A-Z][A-Za-z0-9_]*)/g;

function collectPascalExports(filePath: string): readonly string[] {
  const contents = fs.readFileSync(filePath, "utf8");
  const seen = new Set<string>();
  for (const match of contents.matchAll(PASCAL_EXPORT_RE)) {
    const name = match[1];
    if (name) seen.add(name);
  }
  return [...seen];
}

describe("workspace template coverage", () => {
  for (const starter of STARTERS) {
    describe(starter.id, () => {
      it(`server overlay parses and lists ≥ ${starter.minAgents} agents`, () => {
        const manifest = readManifest(templateOverlayPath(starter.id));
        expect(manifest.agents.length).toBeGreaterThanOrEqual(starter.minAgents);
      });

      it("server overlay and web starter manifest are byte-identical", () => {
        const serverRaw = fs.readFileSync(templateOverlayPath(starter.id), "utf8");
        const webRaw = fs.readFileSync(webManifestPath(starter.id), "utf8");
        // Tolerate trailing newline diffs only; otherwise contents must match.
        expect(webRaw.trimEnd()).toBe(serverRaw.trimEnd());
      });

      it("every agent's componentPath resolves to a real .tsx file", () => {
        const { agents } = readManifest(templateOverlayPath(starter.id));
        const missing: string[] = [];
        for (const agent of agents) {
          const abs = resolveComponentAbsPath(starter.id, agent.componentPath);
          if (!fs.existsSync(abs)) {
            missing.push(agent.componentPath);
          }
        }
        expect(missing).toEqual([]);
      });

      it("every agent's exportName (if present) actually appears in the file", () => {
        const { agents } = readManifest(templateOverlayPath(starter.id));
        const unresolved: string[] = [];
        const exportsCache = new Map<string, readonly string[]>();
        for (const agent of agents) {
          if (!agent.exportName) continue;
          const abs = resolveComponentAbsPath(starter.id, agent.componentPath);
          if (!fs.existsSync(abs)) continue; // covered by previous test
          let exports = exportsCache.get(abs);
          if (!exports) {
            exports = collectPascalExports(abs);
            exportsCache.set(abs, exports);
          }
          if (!exports.includes(agent.exportName)) {
            unresolved.push(`${agent.componentPath}#${agent.exportName}`);
          }
        }
        expect(unresolved).toEqual([]);
      });

      it("lists at most one agent per componentPath", () => {
        const { agents } = readManifest(templateOverlayPath(starter.id));
        const seen = new Map<string, number>();
        for (const agent of agents) {
          seen.set(agent.componentPath, (seen.get(agent.componentPath) ?? 0) + 1);
        }
        const dupes = [...seen.entries()].filter(([, count]) => count > 1).map(([path]) => path);
        expect(dupes).toEqual([]);
      });

      it("multi-export files stamp the primary exportName when present", () => {
        const { agents } = readManifest(templateOverlayPath(starter.id));
        const unresolved: string[] = [];
        const exportsCache = new Map<string, readonly string[]>();
        for (const agent of agents) {
          const abs = resolveComponentAbsPath(starter.id, agent.componentPath);
          if (!fs.existsSync(abs)) continue;
          let exports = exportsCache.get(abs);
          if (!exports) {
            exports = collectPascalExports(abs);
            exportsCache.set(abs, exports);
          }
          if (exports.length <= 1) {
            continue;
          }
          const stem = path.basename(abs, path.extname(abs));
          if (
            agent.exportName &&
            agent.exportName !== stem &&
            !exports.includes(agent.exportName)
          ) {
            unresolved.push(`${agent.componentPath}#${agent.exportName}`);
          }
        }
        expect(unresolved).toEqual([]);
      });
    });
  }
});
