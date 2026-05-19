# AutoDSM Product Strategy

## One-Line Positioning

AutoDSM is a local desktop AI workspace for creating, customizing, maintaining, reviewing, and shipping frontend design systems.

## Core Thesis

T3 Code is the engine. AutoDSM is the product. The user experiences a design-system construction workspace, not a generic coding IDE.

## v1 Loop

```txt
create/open workspace
→ fork shadcn/ui or start Modern Starter
→ browse atomic components
→ edit tokens or one component with scoped AI
→ preview through local Storybook
→ review ChangeSet
→ create local PR record
→ publish typed npm package
```

## Four Pillars

- **Library Forking & Starting**: Modern Starter and shadcn/ui create isolated workspaces under `~/.autodsm/systems/<id>/`.
- **AI-Isolated Component Engineering**: prompts are scoped to one component, its history, active tokens, and library conventions.
- **Centralized Design Tokens**: colors, typography, spacing, and motion are edited visually and propagated to Tailwind/CSS.
- **Live Previews & Sandboxed Rendering**: Storybook runs invisibly and renders live components in a `WebContentsView` canvas.

## In / Out / Defer Rubric

### In for v1

- Modern Starter and shadcn/ui fork.
- Home, Create Component, Design Tokens, Component Page.
- Storybook rendering with generated stories.
- Component-scoped agent runs.
- ChangeSet diff review.
- Local PR records.
- Local typed npm package exports.

### Out for v1

- Direct writes into production repos.
- Unreviewed AI edits.
- Cloud storage of design-system source.
- Generic AI chat unrelated to component systems.
- Design-only Figma replacement workflows.

### Defer to v1.1+

- MUI/Chakra/Mantine fork providers.
- Remote GitHub PRs.
- Hosted registry and brand books.
- Team sync and review queues.
- DSM-1 data flywheel.

## When in Doubt

Ask whether the feature strengthens the local construction loop: fork/start → token/component edit → Storybook preview → ChangeSet review → local PR → package export. If not, defer it.
