# Plans Index

This folder contains execution plans for the T3 Code substrate and the AutoDSM product layer.

## Canonical AutoDSM Plan

- `21-autodsm-execution-roadmap.md` is the current AutoDSM v1 execution roadmap.
- `AUTODSM.md` is the canonical product/build brief.
- `docs/autodsm-target-state/` contains the organized target-state docs (including `features/loading.md` for the workspace fork pipeline).
- `skills/` contains focused implementation guidance for agents.

## How to Read This Folder

### T3 Code substrate plans

Plans `01` through `20`, plus git/provider/runtime plans, mostly describe the T3 Code substrate: IPC, providers, event sourcing, version control, tests, CI, and app/server cleanup. Treat these as substrate history and backlog. Use them when a substrate capability blocks AutoDSM.

### AutoDSM product plan

`21-autodsm-execution-roadmap.md` is the active product plan. It must stay aligned with the local desktop construction-workspace pivot:

```txt
T3 Code is the engine. AutoDSM is the product.
```

AutoDSM v1 creates isolated design-system workspaces under `~/.autodsm/systems/<id>/`, starts from Modern Starter or shadcn/ui, renders through local Storybook, scopes AI to one component, reviews ChangeSets, creates local PR records, and publishes typed npm packages under `~/.autodsm/exports/`.

## Maintenance Rules

- Do not add new AutoDSM roadmap details only to scratch plans. Promote durable decisions to `21-autodsm-execution-roadmap.md` and the relevant target-state doc.
- Do not describe v1 as direct mutation of a user production repo.
- Do not reintroduce `~/.autodsm/projects/<hash>` for v1.
- Mark hosted/team/GitHub-remote/DSM-1 work as v1.1+ unless explicitly promoted.
- Keep `docs/autodsm-target-state/phases/roadmap.md` and this folder's AutoDSM roadmap in sync.
