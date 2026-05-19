# AutoDSM Glossary — Canonical Definitions

## Product Terms

### AutoDSM Workspace

A local design-system workspace under `~/.autodsm/systems/<id>/`. It is AutoDSM-owned and isolated from production repos.

### Modern Starter

AutoDSM's blank-slate starter design system for v1.

### shadcn/ui Fork

A pinned shadcn/ui source copy used as a v1 starting point for a new AutoDSM workspace.

### Atomic Design Grouping

Default component organization: atoms, molecules, organisms, templates, pages.

## Artifacts

### `WorkspaceMetadata`

Workspace identity, package name, version, source, timestamps, publish state, preferences, and Storybook port. Stored in `meta.json`.

### `BrandProfile`

Canonical token profile for colors, typography, spacing, motion, and future token categories.

### `ComponentRegistry`

Indexed component catalog with file path, exports, props, atomic type, token usage, story path, and render health.

### `ComponentConversation`

Per-component conversation history used by scoped agent runs.

### `Session`

An edit session for one component or creation flow. Tracks base state, branch/session name, lifecycle, and PR linkage.

### `GenerationPlan`

Structured description of what the agent intends to change before concrete writes are accepted.

### `ChangeSet`

Reviewable file/hunk diff produced from an agent run or token edit.

### `PullRequest`

A local PR-style record in v1. Remote GitHub fields are optional future extensions.

### `ActivityEntry`

Append-only JSONL workspace timeline entry.

### `PublishedExport`

Installable typed npm package produced under `~/.autodsm/exports/<system-id>-<version>/`.

### `PublishedSnapshot`

Future hosted brand-book artifact. Not a v1 requirement.

## Services

### `StorybookOrchestrator`

Generates stories/config, starts local Storybook, manages render URLs and health.

### `ComponentAgentBridge`

Maps an AutoDSM component run to a T3 Code thread and provider run.

### `TokenStore`

Reads/writes tokens, derives Tailwind/CSS outputs, tracks token usage.

### `PRService`

Creates and tracks local PR records in v1.

### `PublishService`

Bundles a workspace into an installable package.
