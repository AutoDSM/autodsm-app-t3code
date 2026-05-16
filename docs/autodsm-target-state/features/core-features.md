# Core Features Inventory

<!-- AGENT_CONTEXT
type: features
scope: complete-inventory
relates_to:
  - ../phases/roadmap.md
  - ../phases/acceptance-criteria.md
  - ../architecture/system-overview.md
tiers:
  - Free: Basic features
  - Pro: Power features ($29/mo)
  - Team: Governance ($49/seat/mo)
  - Enterprise: Compliance ($40-80K/yr)
-->

## Quick Reference

| Phase | Focus   | Key Feature                     |
| ----- | ------- | ------------------------------- |
| 0-1   | Shell   | Electron scaffold, security     |
| 2     | Index   | BrandProfile, ComponentRegistry |
| 3     | Render  | Vite sidecar, iframe preview    |
| 4     | Visual  | 20 library adapters             |
| 5     | Scan    | Token drift, accessibility      |
| 6     | Agent   | AI editing loop                 |
| 7     | Ship    | Git/PR flow                     |
| 8     | Publish | Snapshot hosting                |

## Phase 0–1: Project Intake & Profile

| Feature                     | Description                                                          | Tier |
| --------------------------- | -------------------------------------------------------------------- | ---- |
| Open local project          | Native folder picker; opens any React/Next/Vite codebase             | Free |
| ProjectProfile generation   | Detects framework, package manager, Tailwind config, monorepo layout | Free |
| Multi-project workspace     | Switch between open projects; per-project state isolation            | Free |
| Recent projects             | Persisted list with last-edited timestamps                           | Free |
| Welcome screen + clone-repo | First-launch surface; supports `git clone` from URL                  | Free |

## Phase 2: BrandProfile & ComponentRegistry

| Feature                    | Description                                                       | Tier |
| -------------------------- | ----------------------------------------------------------------- | ---- |
| Token extraction           | Tailwind config → tokens; CSS variables → tokens                  | Free |
| ComponentRegistry indexing | AST-walks repo, finds shared components, captures prop types      | Free |
| Provider chain inference   | Detects `<Theme>`, `<QueryClient>`, `<Router>`, `<Auth>` wrappers | Free |
| BrandProfile artifact      | Versioned JSON: tokens, fonts, colors, palettes                   | Free |
| ComponentRegistry artifact | Versioned JSON: component → file → props → usage map              | Free |
| Worker-backed AST scan     | Never blocks main process                                         | Free |
| Watch mode                 | Re-indexes on file save with debounce                             | Free |

## Phase 3: Reconstruction Runtime

| Feature                     | Description                                             | Tier |
| --------------------------- | ------------------------------------------------------- | ---- |
| Sidecar Vite preview server | Spawns Vite in `.autodsm/runtime/`, port pool 5180–5189 | Free |
| Iframe-bootstrap host page  | Renders component inside sandboxed iframe               | Free |
| Provider tree composition   | Wraps component in inferred provider chain              | Free |
| Virtual modules             | Vite plugins generate `virtual:autodsm/*` per render    | Free |
| Safe-runtime patches        | Patches fetch, XHR, localStorage, WebSocket, useEffect  | Free |
| Auto-mock providers         | Stubs for routing, auth, query, i18n                    | Free |
| Prop controls               | UI surfaces every prop with typed control               | Free |
| Theme picker                | Light/dark/brand variants from BrandProfile             | Free |
| Viewport picker             | Desktop / tablet / mobile / custom                      | Free |
| Render status badge         | idle / loading / ready / error per component            | Free |
| Structured failure card     | Error class, file, line, suggested fixes                | Free |
| Watchdogs                   | 5s readiness, 8s render → marks failure                 | Free |
| Restart runtime             | One-click cold-restart of Vite sidecar                  | Free |
| Screenshot capture          | Component screenshot grid (theme × viewport)            | Free |

## Phase 4: Preview Adapters

### Top-20 React UI Libraries (v1)

| #   | Library              | Category            |
| --- | -------------------- | ------------------- |
| 1   | Tailwind CSS         | Base layer          |
| 2   | shadcn/ui            | Starter kit         |
| 3   | Radix UI             | Headless primitives |
| 4   | Headless UI          | Tailwind Labs       |
| 5   | React Aria / Ariakit | Accessibility-first |
| 6   | Ark UI               | Zag-based           |
| 7   | Base UI              | MUI headless        |
| 8   | MUI (Material UI)    | Enterprise          |
| 9   | Chakra UI            | Token-driven        |
| 10  | Mantine              | Full kit            |
| 11  | Ant Design           | Enterprise APAC     |
| 12  | NextUI / HeroUI      | Modern Tailwind     |
| 13  | React Bootstrap      | Bootstrap port      |
| 14  | Fluent UI            | Microsoft           |
| 15  | PrimeReact           | Enterprise data     |
| 16  | Blueprint            | Palantir            |
| 17  | Evergreen            | Segment             |
| 18  | Grommet              | Theme-strong        |
| 19  | Semantic UI React    | Long-tail           |
| 20  | DaisyUI / Theme UI   | Tailwind plugin     |

### Adapter SDK

```typescript
interface PreviewAdapter {
  id: string;
  detect(project: ProjectProfile): DetectionResult;
  buildProviderTree(brand: BrandProfile, project: ProjectProfile): ProviderNode[];
  buildVirtualModules(): VirtualModuleSpec[];
  buildMocks(): MockSpec[];
  themeBridge(brand: BrandProfile): ThemeBridge;
  knownGotchas(): GotchaList;
  fixtureSet(): FixtureSet;
}
```

## Phase 5: Off-Brand Scanner

| Feature               | Description                                            | Tier |
| --------------------- | ------------------------------------------------------ | ---- |
| Token-drift detection | Hardcoded hex/rgb/spacing flagged against BrandProfile | Free |
| Provider drift        | Non-canonical providers flagged                        | Free |
| Prop misuse           | Off-list enum values, deprecated props                 | Free |
| Accessibility scan    | axe-core run on every render                           | Free |
| ScanArtifact          | Versioned JSON: violations with severity, fix          | Free |
| Issues panel          | Sortable, filterable list                              | Free |
| Auto-fix from scan    | One-click ChangeSet from violation                     | Pro  |
| Pre-merge gate        | Block PR if scan severity ≥ threshold                  | Team |

## Phase 6: Agent Editing Loop

### Provider Hierarchy

```
1. claude-cli      ← User's Claude Code subscription (preferred)
2. codex-cli       ← User's OpenAI Codex CLI
3. cursor-cli      ← User's Cursor agent CLI
4. anthropic-api   ← BYOT (Anthropic API key)
5. openai-api      ← BYOT (OpenAI API key)
```

### CLI Invocation

| CLI         | Command                                                                          |
| ----------- | -------------------------------------------------------------------------------- |
| Claude Code | `claude -p "<prompt>" --output-format stream-json --permission-mode acceptEdits` |
| Codex       | `codex exec --json --sandbox workspace-write --ask-for-approval never`           |
| Cursor      | `cursor-agent -p "<prompt>" --output-format stream-json`                         |

### ChangeSet Schema

```typescript
interface ChangeSet {
  id: string;
  sessionId: string;
  summary: string;
  files: FileChange[];
  protectedPaths: string[];
  generatedBy: ProviderId;
  validation: ValidationReport;
  createdAt: string;
}
```

### Component Context Payload

For every prompt, AutoDSM injects:

- Component source + colocated CSS/types
- Prop-table from ComponentRegistry
- Provider chain
- Relevant BrandProfile tokens
- Convention rules
- Recent ChangeSets for coherence
- Auto-generated AGENTS.md

### Agent UI Components

| Component          | Purpose                                |
| ------------------ | -------------------------------------- |
| ComponentPromptBox | Natural-language input, model selector |
| AgentRunChip       | `+lines / -lines` chip during run      |
| DiffSlideOver      | 480px right panel with Monaco diff     |
| Approve flow       | Approve → write → HMR re-render        |
| Reject flow        | Reject → discard, branch untouched     |

## Phase 7: Git, PR & Merge

### Trust Commitments

1. **Auth-passthrough** — No long-lived credentials held
2. **Branch-per-session** — `autodsm/<slug>-<date>-<time>`
3. **Native git, native GitHub** — Shell to git, Octokit for API

### Full Loop

```
1. Open project       → Validate repo, remote, default branch
2. First prompt       → Create session branch
3. Agent edits        → Vite HMR re-renders
4. Click +/- chip     → DiffSlideOver
5. Click "Commit"     → Agent message → git commit (hooks run)
6. Click "Open PR"    → git push → Octokit.pulls.create
7. Polling            → Every 15s: checks, reviews, mergeability
8. Click "Merge"      → Octokit.pulls.merge → archive session
```

## Phase 8: Snapshot Publishing

| Feature                    | Description                                           | Tier |
| -------------------------- | ----------------------------------------------------- | ---- |
| PublishedSnapshot artifact | Immutable JSON: BrandProfile + Registry + Screenshots | Free |
| Local snapshot publish     | Single-user shareable bundle (zip/viewer)             | Free |
| autodsm.dev/<handle>       | Hosted subdomain, brand book                          | Pro  |
| Org snapshot publishing    | Custom domain, access control                         | Team |
| Snapshot diff              | Compare two snapshots side-by-side                    | Pro  |

## Phase 9: Hardening

| Feature            | Description                       |
| ------------------ | --------------------------------- |
| macOS code signing | Apple Developer ID                |
| Notarization       | Gatekeeper approval               |
| Auto-update        | Sparkle/Squirrel delta updates    |
| Crash reports      | Local-only default; opt-in Sentry |
| IPC security audit | All channels zod-validated        |

## User Interface Layout

### Component Workbench

```
┌─────────────────────────────────────────────────────────────────┐
│  Component browser (left, 280px)                                │
│  ▸ Atoms                                                        │
│    • Button (active)                                            │
│  ▸ Molecules                                                    │
│  ▸ Layouts                                                      │
├─────────────────────────────────────────────────────────────────┤
│  PreviewCanvas (center, flex)                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │       <iframe> reconstructed render                       │  │
│  └───────────────────────────────────────────────────────────┘  │
│  RenderStatusBadge: ready                                       │
│  ComponentPromptBox: [___________________] [▶ Run]              │
│  AgentRunChip: +12 / −4                                         │
├─────────────────────────────────────────────────────────────────┤
│  Inspector (right, 320px)                                       │
│  Props · Tokens · Issues · Provider chain                       │
└─────────────────────────────────────────────────────────────────┘
```

### DiffSlideOver (480px)

- **Header** — agent provider, model, duration, files count
- **Timeline** — stream events (tool calls, file edits)
- **Diff body** — Monaco unified diff with hunk approve/reject
- **PR card** — status pills, reviewers, merge button

---

<!-- AGENT_ACTIONS
to_implement_feature: Check phase in ../phases/roadmap.md
to_check_acceptance: Read ../phases/acceptance-criteria.md
to_understand_architecture: Read ../architecture/system-overview.md
-->
