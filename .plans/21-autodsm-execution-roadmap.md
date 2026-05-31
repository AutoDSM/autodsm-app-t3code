# AutoDSM v1 Execution Roadmap

## Mission

Build AutoDSM as a local macOS Electron application on top of the T3 Code substrate. AutoDSM lets users create an isolated design-system workspace, start from Modern Starter or shadcn/ui, create/edit components with scoped AI, manage design tokens, preview through Storybook, review diffs, create local PR records, and publish a typed npm package.

## Product Boundary

T3 Code owns generic agent infrastructure: provider/model selection, CLI subprocess execution, event streaming, thread persistence, desktop shell, IPC foundations, and release plumbing.

AutoDSM owns the product layer: auth, workspace/fork model, component registry, token editor, Storybook orchestration, component-scoped agent bridge, ChangeSet/diff/local PR workflow, package publishing, dashboard metrics, telemetry, and feedback.

## Phase 0: Substrate audit and scaffold

- Audit T3 Code packages, IPC, provider runtime, thread storage, and window topology.
- Produce `./autodsm-substrate-audit.md` and `./autodsm-substrate-asks.md`.
- Scaffold AutoDSM apps/packages without rewriting T3 Code internals.
- Confirm baseline T3 Code tests pass.

Acceptance: audit complete, substrate asks documented, dev environment runs, AutoDSM scaffold is minimally invasive.

## Phase 1: Supabase auth and beta gate

- Implement profiles, telemetry, feedback, and publish-log tables with RLS.
- Wire GitHub/Google OAuth through the web onboarding welcome + `/auth/callback`.
- Build sign-in and beta-gate screens.
- Add telemetry batching and feedback widget.

Acceptance: OAuth sign-in works, beta status gates access, telemetry/feedback write to Supabase without design-system source content.

## Phase 2: Workspace and fork

- Bundle/pin Modern Starter and shadcn/ui source.
- Implement `WorkspaceService` and `ForkService`.
- Create `~/.autodsm/systems/<id>/` workspace layout.
- Build workspace list and create-workspace screens.

Acceptance: Modern Starter creates in under 10 seconds, shadcn/ui creates in under 30 seconds, production code is not touched.

## Phase 3: Storybook orchestration

- Implement `StorybookOrchestrator`.
- Generate `.storybook` config and stories.
- Install/run Storybook in workspace sandbox.
- Add preview `WebContentsView` lifecycle and canvas bounds tracking.
- Implement initial `Indexer` and `StoryGenerator`.

Acceptance: workspace components render through local Storybook and the preview view positions correctly.

## Phase 4: Sidebar and navigation

- Build sidebar: Home, Create Component, Design Tokens, Search, atomic component groups.
- Implement routes for the four core surfaces.
- Add Cmd-K global search.
- Persist selected workspace/component.

Acceptance: navigation and search work across real workspace data.

## Phase 5: Home dashboard

- Implement `MetricsService` and `ActivityLog`.
- Build dashboard stats, activity, suggestions, and Publish CTA.

Acceptance: Home shows real component/token/publish/pending-change data.

## Phase 6: Design Tokens

- Implement `TokenStore` and canonical `BrandProfile` persistence.
- Build token tables for colors, typography, spacing, and motion.
- Derive Tailwind/CSS variable outputs.
- Track token usage by component.

Acceptance: token edits write to disk, trigger Storybook re-render, and show affected components.

## Phase 7: Create Component

- Build centered T3 Code-style composer and example prompts.
- Infer component name/slug and atomic type.
- Start component creation through `ComponentAgentBridge`.
- Generate source/story and navigate to Component Page.

Acceptance: prompt creates a component, indexes it, renders it, and persists conversation history.

## Phase 8: Component Page

- Build toolbar, canvas, right rail, props panel, variants dropdown, composer, and history.
- Add `/` commands and `@` token autocomplete.
- Wire scoped component runs through T3 Code.

Acceptance: component edit loop works: prompt → file change → Storybook update → conversation saved → ChangeSet available.

## Phase 9: Diff and PR creation

- Implement `DiffService` and hunk state.
- Build diff chip and slide-over.
- Implement local-only `PRService`.
- Build Create PR dialog.

Acceptance: real diffs display and local PR records appear in the activity feed.

## Phase 10: Publish pipeline

- Bundle components with tsup.
- Generate types, package metadata, README, license, attribution.
- Write exports to `~/.autodsm/exports/<system-id>-<version>/`.
- Add Publish dialog and progress.

Acceptance: exported package installs into a fresh Vite app and renders imported components.

## Phase 11: Polish and hardening

- Resolve PATH when launched from Finder.
- Add CSP, crash recovery, idle subprocess cleanup, workspace recovery, render health monitoring.
- Sign and notarize macOS build.
- Bug bash Modern Starter, shadcn, and token-heavy workspaces.

Acceptance: no orphaned subprocesses, common crashes recover cleanly, signed build passes Gatekeeper.

## Phase 12: Ship

- Record hero demo.
- Update landing page/screenshots.
- Collect testimonials.
- Send beta invites.
- Submit to relevant launch/build programs.

Acceptance: demo, beta invite, and submission assets are complete.

## v1.1 Hooks, Not v1 Scope

Additional library forks, stable Claude Code support, GitHub OAuth/remote PRs, hosted registry/brand books, team sync, screenshot diff checks, and DSM-1 training data are future hooks unless explicitly promoted.

## Required Progress Log

After each phase, update `./build-progress.md` with completed tasks, tests run, acceptance evidence, blockers, and the next phase.
