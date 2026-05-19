# Process Model

## Canonical Topology

T3 Code is the engine; AutoDSM is the product layer.

- Renderer: sandboxed React UI.
- Main process: IPC, windows, services, subprocess supervision.
- T3 Code agent subprocess: Codex-first provider run.
- Storybook subprocess: invisible local render server.
- Workers: indexing and scanning.
- Supabase: auth, beta gate, telemetry, feedback, hashed publish stats.

## AutoDSM Services

`WorkspaceService`, `ForkService`, `Indexer`, `TokenStore`, `StorybookOrchestrator`, `ComponentAgentBridge`, `ContextWriter`, `ConversationStore`, `DiffService`, `PRService`, `PublishService`, `MetricsService`, `ActivityLog`, `TelemetryService`, `FeedbackService`.

## Hard Boundaries

- Renderer never performs privileged filesystem writes.
- AutoDSM writes only under `~/.autodsm/` in v1.
- Storybook preview is separate from the main UI renderer.
- AI output must become a ChangeSet.
- Supabase never stores design-system source.
