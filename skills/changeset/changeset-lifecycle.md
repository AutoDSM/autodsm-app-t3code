# ChangeSet Lifecycle

## Path

```txt
agent run or token edit
→ GenerationPlan when applicable
→ file changes captured
→ ChangeSet computed
→ preview refreshed
→ user reviews hunks
→ local commit
→ local PR record
→ package export when ready
```

## v1 Boundary

ChangeSets apply to AutoDSM-owned workspace files under `~/.autodsm/systems/<id>/`, not production repos.

## Validation

Validate file path boundaries, render health, token usage impact, and diff integrity before allowing local PR or publish actions.
