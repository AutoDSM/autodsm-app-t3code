# Skills — Agent Instruction Library

This directory contains focused implementation guidance for AutoDSM inside the T3 Code repository.

## Canonical Rule

```txt
T3 Code is the engine. AutoDSM is the product.
```

Load skills based on the task, but keep all guidance aligned with the v1 construction-workspace pivot: Modern Starter or shadcn/ui fork, isolated `~/.autodsm/systems/<id>/` workspace, Storybook rendering, component-scoped AI, ChangeSet review, local PR records, and local package publishing.

## Mandatory Reads by Topic

- Design system install targets (starter ids → agents / Components tab): `design-systems/shadcn-ui.md`, `design-systems/mui-material-ui.md`, `design-systems/chakra-ui.md`, `design-systems/tailwind-css-vite.md`
- Product framing: `product/autodsm-product-strategy.md`, `product/autodsm-glossary.md`
- Artifact/data contracts: `architecture/artifact-contracts.md`, `architecture/rpc-and-contracts.md`
- Process/security: `architecture/process-model.md`, `architecture/security-model.md`
- Electron preview: `electron/webcontentsview.md`, `electron/security-checklist.md`
- Rendering: `rendering/webcontentsview-renderer.md`, `rendering/safe-runtime.md`
- Agent context: `agent/agent-context-assembly.md`, `agent/provider-driver-integration.md`
- Coding agent internals (turn loop, providers, models, checkpoints): `agent/coding-agent-architecture.md`
- Change review: `changeset/changeset-lifecycle.md`, `changeset/diff-rendering.md`
- Workflow: `workflow/coding-conventions.md`, `workflow/testing.md`, `workflow/pr-conventions.md`

## Visual References

HTML files in this folder are visual references for architecture and product loops. They should mirror the adjacent Markdown and must be updated when the Markdown changes.

## Conventions

- Do not describe v1 as direct mutation of production repos.
- Do not reintroduce `~/.autodsm/projects/<hash>` for v1.
- Mark hosted/team/GitHub-remote/DSM-1 work as v1.1+ unless explicitly promoted.
- Prefer precise service/artifact names over broad metaphors.
