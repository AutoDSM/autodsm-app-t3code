# AutoDSM — Core Features Inventory

## Feature Groups by Phase

### Phase 0–1: Project Intake & Profile

| Feature | Description | Tier |
|---------|-------------|------|
| Open local project | Native folder picker; opens any React/Next/Vite codebase | Free |
| ProjectProfile generation | Detects framework, package manager, Tailwind config, theme files, monorepo layout | Free |
| Multi-project workspace | Switch between open projects from sidebar; per-project state isolation | Free |
| Recent projects | Persisted list with last-edited timestamps | Free |
| Welcome screen + clone-repo | First-launch surface; supports `git clone` directly from URL | Free |

### Phase 2: BrandProfile & ComponentRegistry

| Feature | Description | Tier |
|---------|-------------|------|
| Token extraction | Tailwind config → tokens; CSS variables → tokens; theme objects → tokens | Free |
| ComponentRegistry indexing | AST-walks repo, finds shared components, captures JSDoc/TS prop types and call-sites | Free |
| Provider chain inference | Detects `<Theme>`, `<QueryClient>`, `<Router>`, `<I18n>`, `<Auth>` wrappers | Free |
| BrandProfile artifact | Versioned JSON: tokens, fonts, logo refs, color palettes, density tiers | Free |
| ComponentRegistry artifact | Versioned JSON: component → file → props → usage map | Free |
| Worker-backed AST scan | Never blocks main process | Free |
| Watch mode | Re-indexes on file save with debounce | Free |

### Phase 3: Reconstruction Runtime

| Feature | Description | Tier |
|---------|-------------|------|
| Sidecar Vite preview server | Spawns Vite dev server in `.autodsm/runtime/`, port pool 5180–5189 | Free |
| Iframe-bootstrap host page | Renders component inside sandboxed iframe driven by RenderManifest | Free |
| Provider tree composition | Wraps component in inferred provider chain | Free |
| Virtual modules | Vite plugins generate `virtual:autodsm/*` per render | Free |
| Safe-runtime patches | Patches fetch, XHR, localStorage, sessionStorage, WebSocket, useEffect | Free |
| Auto-mock providers | Stubs for routing, auth, query, i18n, analytics | Free |
| Prop controls | UI surfaces every prop with typed control | Free |
| Theme picker | Light/dark/brand variants from BrandProfile | Free |
| Viewport picker | Desktop / tablet / mobile / custom | Free |
| RenderManifest artifact | Versioned JSON describing render state | Free |
| Render status badge | idle / loading / ready / error per component | Free |
| Structured failure card | Error class, file, line, provider chain, suggested fixes | Free |
| Watchdogs | 5s readiness, 8s render → marks failure with reason | Free |
| Restart runtime | One-click cold-restart of Vite sidecar | Free |
| Safe-mode toggle | Disables patches for debugging real network | Free |
| Screenshot capture | Component screenshot grid (per theme × viewport) | Free |

### Phase 4: Preview Adapters

**Top-20 React UI Libraries (Frozen for v1)**

| # | Library | Category |
|---|---------|----------|
| 1 | Tailwind CSS | Base layer |
| 2 | shadcn/ui | Starter kit |
| 3 | Radix UI | Headless primitives |
| 4 | Headless UI | Tailwind Labs primitives |
| 5 | React Aria / Ariakit | Accessibility-first |
| 6 | Ark UI | Zag-based primitives |
| 7 | Base UI | MUI headless |
| 8 | MUI (Material UI) | Enterprise |
| 9 | Chakra UI | Token-driven |
| 10 | Mantine | Full kit |
| 11 | Ant Design | Enterprise APAC |
| 12 | NextUI / HeroUI | Modern Tailwind |
| 13 | React Bootstrap | Bootstrap port |
| 14 | Fluent UI | Microsoft |
| 15 | PrimeReact | Enterprise data |
| 16 | Blueprint | Palantir |
| 17 | Evergreen | Segment |
| 18 | Grommet | Theme-strong |
| 19 | Semantic UI React | Long-tail |
| 20 | DaisyUI / Theme UI / Rebass | Tailwind plugin |

**Adapter SDK Contract**

```typescript
interface PreviewAdapter {
  id: string;                   // 'mui', 'chakra', 'shadcn', etc.
  detect(project: ProjectProfile): DetectionResult;
  buildProviderTree(brand: BrandProfile, project: ProjectProfile): ProviderNode[];
  buildVirtualModules(): VirtualModuleSpec[];
  buildBootstrap(): BootstrapSpec;
  buildMocks(): MockSpec[];
  themeBridge(brand: BrandProfile): ThemeBridge;
  knownGotchas(): GotchaList;
  fixtureSet(): FixtureSet;     // CI gate
}
```

### Phase 5: Off-Brand Scanner

| Feature | Description | Tier |
|---------|-------------|------|
| Token-drift detection | Hardcoded hex/rgb/spacing flagged against BrandProfile | Free (read-only) |
| Provider drift | Non-canonical providers flagged | Free (read-only) |
| Prop misuse | Off-list enum values, deprecated props, missing required | Free (read-only) |
| Accessibility scan | axe-core run on every reconstructed render | Free (read-only) |
| ScanArtifact | Versioned JSON: violations with severity, file, line, fix | Free |
| Issues panel | Sortable, filterable list; group by component, severity, type | Free |
| Auto-fix from scan | One-click ChangeSet from violation | Pro |
| Pre-merge gate | Block PR if scan severity ≥ threshold | Team |

### Phase 6: Agent Editing Loop

**Provider Hierarchy (4 Tiers)**

```
1. claude-cli      ← User's Claude Code subscription (preferred)
2. codex-cli       ← User's OpenAI Codex CLI
3. cursor-cli      ← User's Cursor agent CLI
4. anthropic-api   ← BYOT (Anthropic API key)
5. openai-api      ← BYOT (OpenAI API key)
```

**Per-CLI Invocation**

| CLI | Command |
|-----|---------|
| Claude Code | `claude -p "<prompt>" --output-format stream-json --permission-mode acceptEdits --cwd <project>` |
| Codex | `codex exec --json --sandbox workspace-write --ask-for-approval never --ephemeral` |
| Cursor | `cursor-agent -p "<prompt>" --output-format stream-json --cwd <project>` |

**ChangeSet Schema**

```typescript
interface ChangeSet {
  id: string;
  sessionId: string;
  summary: string;
  files: FileChange[];          // path, hunks, delta lines
  protectedPaths: string[];     // never auto-written
  generatedBy: ProviderId;
  validation: ValidationReport; // type-check, lint, scan
  createdAt: string;
}
```

**Component Context Payload**

For every prompt, AutoDSM injects:
- Component source + colocated CSS/types
- Prop-table from ComponentRegistry
- Provider chain
- Relevant BrandProfile tokens
- Convention rules (file naming, import order, classnames)
- Recent ChangeSets for coherence
- Auto-generated AGENTS.md from BrandProfile

**Agent UI Components**

| Component | Purpose |
|-----------|---------|
| ComponentPromptBox | Natural-language input, model selector, send/cancel |
| AgentRunChip | Green/red `+lines / -lines` chip during run |
| DiffSlideOver | 480px right panel with header/timeline/Monaco diff |
| Approve flow | Approve → write → HMR re-render |
| Reject flow | Reject → discard, branch untouched |
| Re-prompt | Refine with prior context preserved |

### Phase 7: Git, PR & Merge

**Trust Commitments**

1. **Auth-passthrough** — No long-lived credentials held
2. **Branch-per-session** — Every session creates `autodsm/<slug>-<date>-<time>`
3. **Native git, native GitHub** — Shell to git, Octokit for API

**Full Prompt-to-Merge Loop**

```
1. Open project       → GitEngine validates repo, remote, default, signing
2. First prompt       → GitEngine.createSessionBranch(componentSlug)
3. Agent edits        → Vite HMR re-renders live
4. Click +/- chip     → DiffSlideOver with StructuredDiff
5. Click "Commit"     → Agent message → user edits → git commit (hooks run)
6. Click "Open PR"    → git push → CredentialResolver → Octokit.pulls.create
7. Polling            → Every 15s: checks, reviews, mergeability
8. Click "Merge"      → Octokit.pulls.merge with sha guard
                      → Archive session, delete local branch, return to default
```

**Auto-Generated PR Body**

```markdown
## What changed
- `src/components/Button.tsx` (modified)

## Why
> make button rounded and use @primary-600
> also bump the size lg to be 48px

## Commits
- `feat(button): round corners, swap to primary-600` (a3f29c1)
- `feat(button): bump lg size to 48px` (b1c44de)

## Tokens referenced
- `color.primary.600` (#2952CC)
- `spacing.lg` (40px → 48px)

---
*Generated by AutoDSM. The author reviewed and approved this change.*
```

### Phase 8: Snapshot Publishing

| Feature | Description | Tier |
|---------|-------------|------|
| PublishedSnapshot artifact | Immutable JSON: BrandProfile + Registry + Manifests + Screenshots | Free |
| Local snapshot publish | Single-user shareable static bundle (zip/viewer) | Free |
| autodsm.dev/<handle> | Hosted personal subdomain, Mintlify-grade brand book | Pro |
| Org snapshot publishing | Custom domain, org-level access control | Team |
| Snapshot diff | Compare two snapshots side-by-side | Pro |

### Phase 9: Hardening

| Feature | Description |
|---------|-------------|
| macOS code signing | Apple Developer ID signing |
| Notarization | App store-equivalent notarization for Gatekeeper |
| Auto-update | Sparkle/Squirrel-based delta updates |
| Crash reports | Local-only default; opt-in Sentry forwarding |
| IPC security audit | Every channel zod-validated; every preload bridge audited |

### Phase 10+: Web Surface

| Feature | Description | Tier |
|---------|-------------|------|
| Hosted brand books | autodsm.dev personal and org subdomains | Pro/Team |
| Team workspace dashboard | Snapshot history, governance, cross-machine sync | Team |
| Read-only governance | Token coverage, drift over time, scan trends | Team |

### Phase 11+: Moat

| Feature | Description | Tier |
|---------|-------------|------|
| DSM-1 | Proprietary fine-tuned model trained on artifact dataset | Team |
| MCP server | Expose ComponentRegistry/BrandProfile/scan as MCP resources | Team |
| Figma sync | Token sync, component mapping | Team |
| AGENTS.md generation | Surface system context to external CLIs | Free |

---

## User-Facing Surface

### App Shell

- **Sidebar** — projects · components · session branches · issues · snapshots · settings
- **Top bar** — project switcher, theme picker, viewport picker, run indicator
- **Status footer** — render status, scanner status, agent status, git status

### Component Workbench Layout

```
┌───────────────────────────────────────────────────────────────┐
│  Component browser (left, 280px)                              │
│  ▸ Atoms                                                      │
│    • Button (active)                                          │
│    • Input                                                    │
│  ▸ Molecules                                                  │
│  ▸ Layouts                                                    │
└───────────────────────────────────────────────────────────────┘
┌───────────────────────────────────────────────────────────────┐
│  PreviewCanvas (center, flex)                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │       <iframe> reconstructed render                     │  │
│  └─────────────────────────────────────────────────────────┘  │
│  RenderStatusBadge: ready                                     │
│  ComponentPromptBox: [___________________] [▶ Run]            │
│  AgentRunChip: +12 / −4                                       │
│  SubmitChangesButton: Review → Open PR → Merge                │
└───────────────────────────────────────────────────────────────┘
┌───────────────────────────────────────────────────────────────┐
│  Inspector (right, 320px)                                     │
│  Props · Tokens · Issues · Provider chain · Render manifest   │
└───────────────────────────────────────────────────────────────┘
```

### DiffSlideOver (480px)

- **Header** — agent provider, model, duration, files count, ChangeSet ID
- **Timeline** — stream events (tool calls, file edits, status changes)
- **Diff body** — Monaco unified diff with hunk-level approve/reject
- **PR card** — status pills, reviewers, merge button (state machine driven)

---

## Onboarding Inflection Points

| Inflection | Trigger | Required? |
|------------|---------|-----------|
| First launch | App opens first time | Optional walkthrough |
| Project open | User opens folder | Silent sweep; banners only if git issues |
| First prompt | First "Run" press | Mandatory: detect provider, offer sign-in, GitHub auth gate |
| First PR | First "Open PR" press | Ask defaultMergeMethod; rest inferred |
| First publish | First "Publish snapshot" | Pro: pick subdomain; Free: pick local destination |
