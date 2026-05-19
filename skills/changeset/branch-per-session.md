# Branch-per-Session

## v1 Rule

Each component edit session should have isolated local session state. If local git is used, branches are internal to the AutoDSM workspace, not the user's production repo.

## Session Start

Create `sessions/<session-id>/manifest.json`, record base commit/state, component slug, branch/session name, and lifecycle status.

## Cleanup

Abandoned sessions should be resumable or explicitly discarded. Never silently delete user-reviewed work.
