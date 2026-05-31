# AutoDSM Target State Documentation

This folder describes the target state for AutoDSM v1 inside the T3 Code repository.

## Core Concept

AutoDSM is a local desktop AI workspace for creating, customizing, maintaining, reviewing, and shipping frontend design systems. It is built on T3 Code, but the product experience is AutoDSM: a design-system construction workspace, not a generic coding IDE.

## Product Loop

```txt
create/open isolated workspace
→ fork shadcn/ui or start Modern Starter
→ browse atomic component system
→ edit tokens or one component
→ render with local Storybook
→ review ChangeSet diff
→ create local PR record
→ publish typed npm package
```

## Document Map

- `architecture/system-overview.md`: high-level system architecture.
- `architecture/process-model.md`: processes, services, lifecycles.
- `architecture/security-model.md`: trust boundaries and Electron security.
- `features/core-features.md`: product surfaces and core capabilities.
- `features/git-integration.md`: v1 local PR records and future remote GitHub hooks.
- `features/providers.md`: T3 Code provider integration and scoped context.
- `features/loading.md`: workspace creation RPC (`autodsm.createWorkspace`), template materialization, thread seeding, COMPONENTS sidebar.
- `phases/roadmap.md`: phase-by-phase implementation sequence.
- `phases/acceptance-criteria.md`: ship criteria and test matrix.
- `diagrams/architecture.html`: visual architecture reference.

## Canonical Artifacts

| Artifact                  | Purpose                                          | v1 location                                                   |
| ------------------------- | ------------------------------------------------ | ------------------------------------------------------------- |
| `WorkspaceMetadata`       | Workspace identity, source, version, preferences | `~/.autodsm/systems/<id>/meta.json`                           |
| `BrandProfile`            | Tokens and brand foundation                      | `~/.autodsm/systems/<id>/system/.autodsm/brand-tokens.json`   |
| `ComponentRegistry`       | Indexed components, props, stories, health       | rebuilt from `system/src/components/`                         |
| `ComponentAgentsManifest` | Sidebar + AI thread binding                      | `~/.autodsm/systems/<id>/component-agents.json`               |
| `ComponentConversation`   | Per-component AI history                         | `~/.autodsm/systems/<id>/conversations/<slug>.json`           |
| `Session`                 | Active edit session state                        | `~/.autodsm/systems/<id>/sessions/<session-id>/manifest.json` |
| `ChangeSet`               | Reviewable file/hunk diff                        | `~/.autodsm/systems/<id>/sessions/<session-id>/`              |
| `PullRequest`             | Local PR record                                  | `~/.autodsm/systems/<id>/prs/<pr-id>.json`                    |
| `ActivityEntry`           | Workspace timeline event                         | `~/.autodsm/systems/<id>/activity-log.jsonl`                  |
| `PublishedExport`         | Installable npm package                          | `~/.autodsm/exports/<system-id>-<version>/`                   |

## Principles

- T3 Code is the engine. AutoDSM is the product.
- Workspaces are local-first and isolated under `~/.autodsm/`.
- AutoDSM v1 does not write into production repos.
- AI edits are component-scoped and become ChangeSets.
- Storybook is the invisible v1 rendering substrate.
- Supabase never stores design-system source.
- v1 starts from Modern Starter or shadcn/ui only.
