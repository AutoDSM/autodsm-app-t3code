# Artifact Contracts

## Rule

Every durable AutoDSM feature should read or write a named artifact. Artifacts make the product debuggable, testable, reviewable, and portable.

## Canonical v1 Artifacts

| Artifact                  | Owner                                | Location                                                      |
| ------------------------- | ------------------------------------ | ------------------------------------------------------------- |
| `WorkspaceMetadata`       | `WorkspaceService`                   | `~/.autodsm/systems/<id>/meta.json`                           |
| `BrandProfile`            | `TokenStore`                         | `system/.autodsm/brand-tokens.json` plus derived CSS/Tailwind |
| `ComponentRegistry`       | `Indexer`                            | rebuilt/cacheable from `system/src/components/`               |
| `ComponentAgentsManifest` | `ComponentAgentStore`                | `~/.autodsm/systems/<id>/component-agents.json`               |
| `ComponentConversation`   | `ConversationStore`                  | `conversations/<slug>.json`                                   |
| `Session`                 | `ComponentAgentBridge`               | `sessions/<session-id>/manifest.json`                         |
| `GenerationPlan`          | agent bridge/context layer           | session directory                                             |
| `ChangeSet`               | `ChangeSetCollector` / `DiffService` | session directory                                             |
| `PullRequest`             | `PRService`                          | `prs/<pr-id>.json`                                            |
| `ActivityEntry`           | `ActivityLog`                        | `activity-log.jsonl`                                          |
| `PublishedExport`         | `PublishService`                     | `~/.autodsm/exports/<system-id>-<version>/`                   |

## Deprecated or Future Terms

- `ProjectProfile`: use only for future imported-repo support, not core v1 workspace construction.
- `RenderEnvironmentProfile`: keep only if needed as an internal Storybook/render diagnostic artifact.
- `PublishedSnapshot`: future hosted brand book, not v1 package export.

## Add a New Artifact

Define purpose, owner service, location, schema, lifecycle events, validation, and whether it can leave the machine. If it cannot fit this structure, it is probably UI state rather than a durable product artifact.
