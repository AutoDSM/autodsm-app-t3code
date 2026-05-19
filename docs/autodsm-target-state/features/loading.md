# AutoDSM workspace loading and fork pipeline

This document specifies how the **onboarding loading screen** should be backed by real workspace creation after the UI slice that simulates progress. Product onboarding persists `starterId` in client UI state; the server must materialize `~/.autodsm/systems/<id>/` and bridge into T3 orchestration.

## Trigger

- **RPC:** `autodsm.createWorkspace` is defined in [`packages/contracts/src/rpc.ts`](../../../packages/contracts/src/rpc.ts), handled in [`apps/server/src/ws.ts`](../../../apps/server/src/ws.ts), and implemented by [`autodsmMaterializeWorkspace`](../../../apps/server/src/autodsm/autodsmCreateWorkspace.ts) (bundled templates under [`apps/server/workspace-templates/`](../../../apps/server/workspace-templates/)).
- **Input (schema):** [`AutoDsmCreateWorkspaceInput`](../../../packages/contracts/src/autodsmArtifacts.ts): `starterId`, `environmentId`, optional `displayName`.
- **Output (schema):** [`AutoDsmCreateWorkspaceResult`](../../../packages/contracts/src/autodsmArtifacts.ts): `workspaceId`, `cwd` (workspace root = `…/systems/<id>/system`), `projectId`, `starterId`, `threads` (seeded `threadId` + `componentPath` per template `component-agents.json`).

Optional **progress** (poll or stream) can replace the onboarding client’s coarse stage timer later.

### UI wiring (current)

- Onboarding loading: [`AutoDsmOnboardingLoading.tsx`](../../../apps/web/src/components/autodsm/onboarding/AutoDsmOnboardingLoading.tsx) calls the RPC, then sets `autoDsmWorkspaceProjectRef`, merges `autoDsmThreadComponentPathById` in [`uiStateStore`](../../../apps/web/src/uiStateStore.ts), and navigates to the first component agent thread with `componentPath`.
- **Component agent sidebar:** for materialized `~/.autodsm/systems/` workspaces, the **Projects** section is hidden. The sidebar shows flat component agent tabs (Button, Card, …) via [`AutoDsmComponentAgentSidebarSection`](../../../apps/web/src/components/autodsm/AutoDsmComponentAgentSidebarSection.tsx), which reuses [`useAutoDsmComponentAgentTabs`](../../../apps/web/src/hooks/useAutoDsmComponentAgentTabs.ts) and [`AutoDsmComponentAgentTabBar`](../../../apps/web/src/components/autodsm/AutoDsmComponentAgentTabBar.tsx) (`layout="sidebar"`). Selecting a tab opens that agent thread and merges `componentPath` for preview in the main pane (**WebContentsView**). On desktop, the horizontal chat header tab bar is hidden when the sidebar shows agents.
- **Path reconciliation:** when local `autoDsmThreadComponentPathById` is incomplete (for example after reopening the app or opening threads from Cmd-K Search without `componentPath`), [`useAutoDsmComponentAgentTabs`](../../../apps/web/src/hooks/useAutoDsmComponentAgentTabs.ts) reconciles workspace threads against the starter’s `component-agents.json` manifest ([`autoDsmReconcileComponentAgentPaths.ts`](../../../apps/web/src/lib/autoDsmReconcileComponentAgentPaths.ts)) by matching thread titles, merges missing mappings into UI state, and renders the full COMPONENTS list on first paint.
- **Stable agent tab titles:** component-agent threads (any thread with a mapped `componentPath`) keep their sidebar name when the first prompt is sent — AutoDSM skips client auto-title and omits `titleSeed` on `thread.turn.start` ([`autoDsmComponentAgentThread.ts`](../../../apps/web/src/lib/autoDsmComponentAgentThread.ts)).

### Three-column component agent layout (desktop)

When a thread has `componentPath` set, the chat surface uses **nav | preview | agent**:

| Column | Content                                                                         |
| ------ | ------------------------------------------------------------------------------- |
| Left   | Primary nav + flat component agent tabs (`AutoDsmComponentAgentSidebarSection`) |
| Center | Live component preview (`WebContentsView`, product variant hides dev chrome)    |
| Right  | Coding agent timeline + composer                                                |

- **Preview loading:** switching component agent tabs shows a centered skeleton in the center pane while analyze/bundle/prime runs (`ComponentPreviewLoadingSkeleton` in product `WebContentsView`); dev/status strings (`Analyzing component…`, `Bundling preview…`, native host placeholder) are suppressed in product mode.

Desktop Electron auth bootstraps via `desktopBridge.getLocalEnvironmentBootstrap()` — the browser **Pair with this environment** form is not part of the product shell. The renderer polls for the local backend handoff (up to ~20s) and keeps retrying in the background; no manual pairing token is required during local development.

**Local dev pairing bypass (temporary):** `bun run dev`, `bun run dev:server`, and `bun run dev:desktop` set `T3CODE_DEV_DISABLE_PAIRING=1` via [`scripts/dev-runner.ts`](../../../scripts/dev-runner.ts). Loopback clients call `POST /api/auth/dev-auto-bootstrap` and receive an owner session cookie automatically — no `/pair` UI or pasted startup token. To re-enable pairing locally: `T3CODE_DEV_DISABLE_PAIRING=0 bun run dev:desktop`. Do not enable this flag in production builds.

### Create component flow (Phase 7)

- Route: [`/_chat/design-components`](../../../apps/web/src/routes/_chat.design-components.tsx) defaults to **Create** mode with a centered composer ([`AutoDsmCreateComponentWorkspace`](../../../apps/web/src/components/autodsm/AutoDsmCreateComponentWorkspace.tsx)); **Browse** retains the registry inspector ([`AutoDsmComponentsWorkspace`](../../../apps/web/src/components/autodsm/AutoDsmComponentsWorkspace.tsx)).
- On send, [`useAutoDsmCreateComponent`](../../../apps/web/src/hooks/useAutoDsmCreateComponent.ts) infers `componentPath`, runs `thread.create` + `thread.turn.start` with the scoped create prompt ([`autoDsmCreateComponentPrompt.ts`](../../../apps/web/src/lib/autoDsmCreateComponentPrompt.ts)), merges `autoDsmThreadComponentPathById` via [`mergeAutoDsmThreadComponentPaths`](../../../apps/web/src/uiStateStore.ts), and navigates to the three-column agent thread with `componentPath`.
- When a component-agent turn completes, [`useAutoDsmComponentPreviewRefreshOnTurnComplete`](../../../apps/web/src/hooks/useAutoDsmComponentPreviewRefreshOnTurnComplete.ts) invalidates component registry / preview queries so **WebContentsView** re-analyzes once the `.tsx` file exists (after ChangeSet approval applies writes in v1).
- While an agent turn is active, the same hook polls preview bundle/manifest queries (~1.5s) so design changes hot-reload in the center pane without switching sidebar tabs.

## Filesystem layout

Per [`AUTODSM.md`](../../../AUTODSM.md), each system lives at:

```txt
~/.autodsm/systems/<id>/
  system/           # package root (components, tokens, tailwind, package.json)
  storybook/        # isolated SB sandbox
  conversations/
  sessions/
  prs/
  activity-log.jsonl
  git/
  meta.json
```

**v1 rule:** no writes to the user’s production repository; all source under `~/.autodsm/`.

## Template cache

Pin canonical trees under:

```txt
~/.autodsm/cache/
  modern-starter/
  shadcn-ui/
  mui/
  chakra-ui/
  tailwind-css/
```

`ForkService` (or equivalent in [`apps/server/src/autodsm/`](../../../apps/server/src/autodsm/)) should:

1. Resolve or download pinned template revision for `starterId`.
2. Copy into `systems/<id>/system/` (and scaffold `storybook/` as needed).
3. Write `meta.json` (`WorkspaceMetadata`: id, `starterId`, package name, timestamps, Storybook port, etc.).

## Per-starter steps (after copy)

1. Write or merge `meta.json` and default `BrandProfile` / token files if absent.
2. **Install dependencies** in `system/` and Storybook sandbox (`pnpm` / `bun` per workspace detector).
3. Generate **Storybook** config and baseline stories when missing (`StorybookOrchestrator`).
4. Run **indexer** so `AutoDsmProjectProfile`, `AutoDsmBrandProfile`, and `AutoDsmComponentRegistry` become `ready` (reuse [`AutoDsmWorkspaceService`](../../../apps/server/src/autodsm/AutoDsmWorkspaceService.ts)).
5. Start or warm **preview sidecar** / Vite preview for component canvas (existing `autodsmVitePreviewSidecar` path).

## UI stage mapping

The product onboarding UI uses four labels; map them to fork phases for consistent UX:

| UI stage            | Implementation phase                                     |
| ------------------- | -------------------------------------------------------- |
| Copying template    | Cache resolve + copy into `systems/<id>/`                |
| Installing packages | Package manager install in `system/` + Storybook sandbox |
| Indexing components | Registry + profile indexing + workspace build            |
| Preparing preview   | Sidecar / Storybook URL readiness                        |

Reuse **`AutoDsmIndexingProgressEvent`** ([`autodsmArtifacts`](../../../packages/contracts/src/autodsmArtifacts.ts)) for streaming progress where possible.

## Orchestration bridge

After `cwd` exists and is valid:

1. Dispatch **`project.create`** with `workspaceRoot: cwd` and `createWorkspaceRootIfMissing: true` (existing orchestration pattern).
2. Client sets **`autoDsmWorkspaceProjectRef`** ([`uiStateStore`](../../../apps/web/src/uiStateStore.ts)) so `useAutoDsmWorkspace` resolves the new project for Home / Components / Tokens.

## Provider packs

Starter templates should declare dependencies such that static detection + [`providerPackCatalog.ts`](../../../apps/server/src/autodsm/providerPackCatalog.ts) resolves:

| starterId      | Expected packs / hints                          |
| -------------- | ----------------------------------------------- |
| shadcn-ui      | `pack:shadcn-radix` (tailwind + radix)          |
| mui            | `pack:mui`                                      |
| chakra-ui      | `pack:chakra`                                   |
| tailwind-css   | Tailwind only; no component-library pack        |
| modern-starter | Tailwind + minimal primitives as defined in kit |

## Acceptance targets (initial)

- **modern-starter** / **tailwind-css:** create under 10s after cache warm (excluding cold network).
- **shadcn-ui:** under 30s after cache warm.
- **mui** / **chakra-ui:** under 45s after cache warm (or document longer if full kits copied).

Every starter: hero path reaches **`/home`** with non-empty or explicitly empty registry, no gate errors, and preview URL reachable for at least one story.

## Error recovery

- Partial `systems/<id>` after failure: mark workspace `failed` in `meta.json`, offer **Retry** and **Choose another library**.
- Do not leave orphaned Storybook/sidecar processes (idle eviction, shutdown on workspace close).
- Log errors to `~/.autodsm/logs/` without sending source to Supabase.

## References

- Product brief: [`AUTODSM.md`](../../../AUTODSM.md)
- Execution roadmap: [`.plans/21-autodsm-execution-roadmap.md`](../../../.plans/21-autodsm-execution-roadmap.md)
- Target state index: [`../README.md`](../README.md)
