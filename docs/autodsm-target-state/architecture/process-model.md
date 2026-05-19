# Process Model

## Processes

- **Electron renderer**: AutoDSM UI screens with no Node integration.
- **Electron main**: app lifecycle, windows, preview `WebContentsView`, IPC handlers, services, subprocesses, filesystem.
- **T3 Code agent subprocess**: Codex CLI primary in v1; Claude Code later when stable.
- **Storybook subprocess**: local per-workspace render server with idle eviction.
- **Worker threads**: indexing, token usage scanning, future scanner work.
- **Supabase**: auth, beta gate, telemetry, feedback, hashed publish logs.

## Main Services

`WorkspaceService`, `ForkService`, `Indexer`, `TokenStore`, `StorybookOrchestrator`, `ComponentAgentBridge`, `ContextWriter`, `ConversationStore`, `DiffService`, `PRService`, `PublishService`, `MetricsService`, and `ActivityLog` form the AutoDSM process model.

## Lifecycle: Workspace Open

1. Read `meta.json`.
2. Validate workspace layout.
3. Start or reuse Storybook.
4. Run indexer.
5. Load token profile.
6. Populate Home/sidebar state.
7. Select last active component if available.

## Lifecycle: Component Edit

1. Start AutoDSM session.
2. Prepare scoped context.
3. Run T3 Code agent in workspace `system/` directory.
4. Stream events.
5. Capture file changes.
6. Re-index touched component.
7. Refresh Storybook preview.
8. Persist conversation.
9. Expose diff for review.

## Lifecycle: Publish

1. Validate workspace.
2. Generate `system/index.ts` if missing.
3. Bundle with tsup.
4. Generate package metadata, README, license, and attribution.
5. Write export directory.
6. Append activity and privacy-preserving publish log.

## Responsibility Boundaries

Renderer never reads/writes workspace files directly. Main process never blocks on AST-heavy work. Agent output never becomes final without ChangeSet review. Storybook is isolated from the main renderer. Supabase never receives source artifacts.
