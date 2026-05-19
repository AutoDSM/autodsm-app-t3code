# Git and PR Integration

## v1 Position

AutoDSM v1 uses PR-style review semantics without requiring remote GitHub integration. The design-system workspace is local and AutoDSM-owned. The user's production repository is not mutated.

## Trust Commitments

- AI output becomes a ChangeSet before it is committed.
- The user can inspect file-level and hunk-level diffs.
- Approved changes can be committed into local workspace history.
- Create PR in v1 creates a local PR record, not a remote GitHub PR.

## Local PR Record

Stored at `~/.autodsm/systems/<id>/prs/<pr-id>.json` with id, workspace id, session id, component slug, title, description, state, timestamps, local branch/base branch, and optional future GitHub fields.

## Create PR Flow

1. User clicks Create PR.
2. Dialog opens with generated title and description.
3. User reviews target and summary.
4. AutoDSM commits approved changes to local workspace history.
5. AutoDSM writes a PR record.
6. Activity feed receives `pr.created`.

## Future GitHub Hook

v1.1 may add GitHub OAuth, remote push, Octokit PR creation, reviewers, screenshots, and check runs. Do not describe these as required v1 behavior.
