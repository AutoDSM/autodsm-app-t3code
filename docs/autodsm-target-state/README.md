# AutoDSM Target State Documentation

<!-- AGENT_CONTEXT
type: index
project: autodsm
version: 1.0-target
description: Local-first AI workspace for React component libraries
-->

## Quick Reference

| What         | Value                                          |
| ------------ | ---------------------------------------------- |
| **Product**  | AutoDSM - The Agentic Storybook                |
| **Platform** | macOS Electron desktop app                     |
| **Stack**    | T3 Code fork, Electron, React, Effect.js, Vite |
| **ICP**      | Design engineers, frontend platform leads      |

## Document Map

```
docs/autodsm-target-state/
├── README.md                          # This file - index & overview
├── diagrams/
│   └── architecture.html              # Interactive visual diagram
├── architecture/
│   ├── system-overview.md             # Process model, IPC, data flow
│   ├── process-model.md               # Detailed service architecture
│   └── security-model.md              # Security configuration & threats
├── features/
│   ├── core-features.md               # Feature inventory by phase
│   ├── providers.md                   # AI provider integration
│   └── git-integration.md             # Git/GitHub workflow
└── phases/
    ├── roadmap.md                     # Implementation phases
    └── acceptance-criteria.md         # Phase completion gates
```

## Core Concept

```
Storybook (component browser) + Cursor (AI editing) = AutoDSM
```

### The Loop

```
SELECT → REQUEST → PREVIEW → REVIEW → VALIDATE → MERGE
component   change    render    diff     scan     safely
```

## Canonical Artifacts

Every feature reads or writes one of these artifacts:

| Artifact            | Purpose                     | File                                       |
| ------------------- | --------------------------- | ------------------------------------------ |
| `ProjectProfile`    | Framework, config detection | `~/.autodsm/projects/<hash>/profile.json`  |
| `BrandProfile`      | Tokens, fonts, colors       | `~/.autodsm/projects/<hash>/brand.json`    |
| `ComponentRegistry` | Components, props, usage    | `~/.autodsm/projects/<hash>/registry.json` |
| `RenderManifest`    | Per-render state            | In-memory                                  |
| `ScanArtifact`      | Violations, severity        | `~/.autodsm/projects/<hash>/scans/`        |
| `ChangeSet`         | Agent-proposed changes      | `~/.autodsm/changesets/`                   |
| `PublishedSnapshot` | Immutable brand books       | `~/.autodsm/snapshots/`                    |

## Key Differentiators

| vs.            | AutoDSM Edge                                        |
| -------------- | --------------------------------------------------- |
| Storybook      | No `.stories` files, AI editing, real-repo fidelity |
| Cursor/Copilot | Component context, ChangeSet validation, merge-safe |
| Chromatic      | Generates changes, not just detects them            |

## Principles

### Local-First (Non-Negotiable)

- Source code never leaves machine unless explicitly published
- No secrets sent to AutoDSM servers
- AST scans stay local

### Merge-Safe

- Every write mediated by ChangeSet
- Every commit is user's commit
- Branch-per-session (never edit default branch)

## Target Users

**Primary:** In-house teams owning reusable React component systems

**Titles:** Design Engineer, Frontend Platform Engineer, Design System Lead

**Anti-ICP:** Design-only teams, teams without shared components, teams without PRs

## Quick Links

- [Interactive Architecture Diagram](./diagrams/architecture.html)
- [System Architecture](./architecture/system-overview.md)
- [Core Features](./features/core-features.md)
- [Implementation Roadmap](./phases/roadmap.md)

---

<!-- AGENT_ACTIONS
to_understand_architecture: Read ./architecture/system-overview.md
to_understand_features: Read ./features/core-features.md
to_understand_security: Read ./architecture/security-model.md
to_understand_ai_integration: Read ./features/providers.md
to_understand_git_workflow: Read ./features/git-integration.md
-->
