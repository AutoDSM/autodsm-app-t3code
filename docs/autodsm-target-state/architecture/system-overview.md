# System Architecture Overview

## Quick Reference

AutoDSM is implemented as a product layer on top of the T3 Code substrate.

```txt
Electron renderer UI
  ↕ typed IPC / RPC
Electron main + T3 Code services
  ↕ subprocesses / filesystem / HTTPS
Codex CLI, Storybook, tsup, git, Supabase
  ↕ local data
~/.autodsm/systems and ~/.autodsm/exports
```

## T3 Code Engine

T3 Code owns provider detection, model selection, CLI subprocess spawning, event streaming/parsing, thread persistence, desktop shell, release pipeline, and base IPC patterns.

## AutoDSM Product Layer

AutoDSM adds `AuthService`, `WorkspaceService`, `ForkService`, `Indexer`, `TokenStore`, `StorybookOrchestrator`, `ConversationStore`, `ComponentAgentBridge`, `ContextWriter`, `ChangeSetCollector`, `DiffService`, `PRService`, `PublishService`, `MetricsService`, `ActivityLog`, `TelemetryService`, and `FeedbackService`.

## Data Flow: Component Prompt to Local PR

1. User opens a component in the Component Page.
2. Renderer calls `agent.startComponentRun` through typed IPC.
3. `ComponentAgentBridge` creates/reuses a T3 Code thread for `{ workspaceId, componentSlug }`.
4. `ContextWriter` assembles component source, conversation history, active tokens, slash/token references, and library conventions.
5. T3 Code starts Codex CLI in `~/.autodsm/systems/<id>/system/`.
6. File changes are captured by `ChangeSetCollector`.
7. Storybook HMR updates the preview canvas.
8. `DiffService` exposes reviewable hunks.
9. `PRService` creates a local PR record in `prs/<pr-id>.json`.

## Rendering Path

v1 uses Storybook as the rendering substrate. `StorybookOrchestrator` generates config/stories, starts a local server, and the main process hosts a preview `WebContentsView` pointed at the selected story URL.

## Directory Structure

```txt
~/.autodsm/
  systems/<id>/
    system/
    storybook/
    conversations/
    sessions/
    prs/
    activity-log.jsonl
    git/
    meta.json
  exports/<system-id>-<version>/
  cache/
  settings.json
  logs/
```

## Cloud Plane

Supabase is limited to auth, beta gate, telemetry events, feedback reports, and privacy-preserving publish logs. No design-system source, raw token values, component code, story code, or package contents should be sent to Supabase in v1.
