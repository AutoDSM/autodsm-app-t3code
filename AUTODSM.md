# AUTODSM.md

## AutoDSM Technical Build Brief and Product Architecture

This is the canonical agent-facing brief for building **AutoDSM v1** inside the T3 Code-based repository.

AutoDSM is a local desktop application and AI-powered workspace for creating, customizing, maintaining, reviewing, and shipping frontend design systems. It gives designers, engineers, and product managers a visual workbench for constructing real, production-ready React UI component libraries through AI instructions, token controls, live previews, and PR-style review.

The one-line build rule is:

```txt
T3 Code is the engine. AutoDSM is the product.
```

T3 Code provides the generic coding-agent substrate: desktop shell, agent subprocess execution, provider/model plumbing, event streaming, thread persistence, typed IPC patterns, and release foundations. AutoDSM layers design-system workspaces, library forking, Storybook rendering, token editing, component-scoped AI workflows, ChangeSet review, local PR records, and package publishing on top.

## Canonical v1 Loop

```txt
open AutoDSM
→ sign in / pass beta gate
→ create or open an isolated design-system workspace
→ start from Modern Starter or fork shadcn/ui into ~/.autodsm/systems/<id>/
→ browse components grouped by Atomic Design
→ edit tokens or create/edit one component with scoped AI context
→ preview through an invisible local Storybook server in a WebContentsView canvas
→ inspect props, variants, diffs, and conversation history
→ approve/reject ChangeSet hunks
→ create a local PR record
→ publish a typed npm package under ~/.autodsm/exports/<system-id>-<version>/
```

Everything in this repository should strengthen that loop.

## Repository Context

The product is being built in:

```txt
/Users/sebastianmendo/autodsm-ai/ts-code/t3code
https://github.com/AutoDSM/autodsm-app-t3code
```

Agents should read:

```txt
AUTODSM.md
.plans/README.md
docs/autodsm-target-state/README.md
skills/README.md
```

## Four Product Pillars

### Library Forking & Starting

Users start from AutoDSM's Modern Starter or fork shadcn/ui. AutoDSM copies the starter into an isolated local workspace under `~/.autodsm/systems/<id>/`. The user's production codebase is not touched.

### AI-Isolated Component Engineering

Users create or edit individual components through a chat composer. A component run is scoped to that component, its conversation history, active brand tokens, selected slash/token references, and library conventions. It does not receive the whole application by default.

### Centralized Design Tokens

Users manage colors, typography, spacing, motion, and future token categories through a visual table editor. Token changes update canonical token files and derived Tailwind/CSS variable outputs, then trigger live preview updates. Reverse lookup shows which components are affected.

### Live Previews & Sandboxed Rendering

AutoDSM orchestrates an invisible local Storybook server for each active workspace. Components render in a centered Electron `WebContentsView` canvas with props and variant controls while the main React UI stays sandboxed.

## Tracking and Shipping

- **PR-style review**: AI-generated changes become a ChangeSet with file/hunk diff review, approval/rejection, local commits, and local PR records.
- **One-click package publishing**: AutoDSM bundles the workspace into a real typed npm package that developers can install from the exported path.

## What AutoDSM Is Not

AutoDSM is not a generic AI coding IDE, Figma replacement, greenfield design-to-code toy, cloud-first scanner, pure docs site, or tool that writes unreviewed AI changes into production code. Existing-repo import, hosted snapshots, remote GitHub PRs, team sync, and DSM-1 are future hooks unless explicitly promoted.

## Non-Negotiable Constraints

- **T3 Code substrate**: consume and extend T3 Code primitives. Do not rewrite T3 Code internals unless a minimal documented substrate ask is required.
- **Local-first workspace**: AutoDSM-created source lives under `~/.autodsm/systems/<id>/system/`.
- **No production-code writes**: the app never writes to the user's production repo in v1.
- **Auth-passthrough for AI**: AutoDSM does not proxy model tokens. T3 Code spawns the user's local agent CLI, Codex-first in v1.
- **Supabase limits**: Supabase is for auth, beta gate, telemetry, feedback, and privacy-preserving publish stats. It does not store design-system source.
- **Sandboxed Electron**: `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`, typed Zod-validated IPC, strict CSP, and locked preview navigation.
- **Per-component agent context**: AI receives only the active component context plus safe workspace metadata.
- **Atomic component model**: components are grouped by atoms, molecules, organisms, templates, and pages by default.
- **v1 stack**: Modern Starter, shadcn/ui fork, MUI starter, Chakra UI starter, Tailwind starter, React, Tailwind, Storybook, local package exports, local PR records.
- **No v1 scope expansion**: Mantine, Ant Design, hosted registry, remote GitHub PRs, team sync, DSM-1, and screenshot PR checks are v1.1+ unless explicitly promoted.

## Core Product Surfaces

- **Home**: workspace dashboard with name, source, version, stats, activity, suggestions, and Publish CTA.
- **Create Component**: T3 Code-style composer for generating a new component in the active workspace.
- **Design Tokens**: table editor for colors, typography, spacing, and motion.
- **Component Page**: live Storybook preview, props/variant controls, scoped composer, conversation history, diff chip, diff slide-over, and Create PR action.

## Local Filesystem Contract

```txt
~/.autodsm/
  systems/<id>/
    system/
      components/
      tokens/
      lib/
      tailwind.config.ts
      package.json
    storybook/
      .storybook/
      stories/
      node_modules/
      dev.log
    conversations/<component>.json
    sessions/<session-id>/
    prs/<pr-id>.json
    activity-log.jsonl
    git/
    meta.json
  exports/<system-id>-<version>/
  cache/
    shadcn-source/
    modern-starter/
    storybook-pnpm-store/
  settings.json
  logs/
```

Do not reintroduce `~/.autodsm/projects/<hash>` for v1 docs unless describing archived history.

## Canonical Artifacts

- `WorkspaceMetadata`: identity, package name, version, source, timestamps, publish status, preferences, Storybook port.
- `BrandProfile`: colors, typography, spacing, motion, future token categories.
- `ComponentRegistry`: component metadata, atomic type, props, story path, token usage, render health.
- `ComponentConversation`: scoped prompt/response history for one component.
- `Session`: edit session with branch/base state and lifecycle status.
- `GenerationPlan`: structured agent intent before file edits are accepted.
- `ChangeSet`: concrete file/hunk diff with approval decisions.
- `PullRequest`: local PR record in v1, optionally extended with GitHub fields later.
- `ActivityEntry`: append-only workspace timeline event.
- `PublishedExport`: local installable package output under `~/.autodsm/exports/`.

`PublishedSnapshot` is reserved for future hosted brand books and should not be described as a v1 requirement.

## Architecture Summary

AutoDSM services: `AuthService`, `WorkspaceService`, `ForkService`, `Indexer`, `TokenStore`, `StorybookOrchestrator`, `ComponentAgentBridge`, `ContextWriter`, `ChangeSetCollector`, `DiffService`, `PRService`, `PublishService`, `MetricsService`, `ActivityLog`, `TelemetryService`, and `FeedbackService`.

Every renderer-to-main and main-to-renderer message must be defined through typed contracts and Zod validation.

## Implementation Phases

Use `.plans/21-autodsm-execution-roadmap.md` and `docs/autodsm-target-state/phases/roadmap.md` as the execution source of truth.

## Hero Path

```txt
open signed macOS app
→ sign in
→ create workspace from shadcn/ui or Modern Starter
→ see components indexed and rendered
→ edit Button through scoped AI composer
→ see Storybook preview update
→ review diff and approve hunks
→ create local PR record
→ publish package
→ install package into fresh Vite app
→ render imported component successfully
```

## Agent Operating Prompt

```txt
Preserve T3 Code as the engine and AutoDSM as the product layer. Build only the requested phase/slice. Do not rewrite unrelated T3 Code internals. Keep all AutoDSM-owned source under ~/.autodsm/systems/<id>/ and exports under ~/.autodsm/exports/. Scope agent context to the active component. Use Storybook as the invisible v1 render substrate. All cross-process payloads must be typed and Zod-validated. AI output must become a reviewable ChangeSet before it is committed or published. Do not expand v1 beyond Modern Starter, shadcn/ui fork, local PR records, and local package publishing unless explicitly instructed.
```
