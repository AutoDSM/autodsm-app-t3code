# Branch-per-Session

> Use this skill any time the app reaches for `git`. AutoDSM **never** edits
> the default branch directly. Every session writes on its own branch (or
> worktree) named after the agent thread.

## The rule

- One agent thread = one session branch.
- Branch name: `autodsm/<thread-id>` (no slashes inside `<thread-id>`).
- The session branch is created off the _current commit on the default branch
  at session start_, never off a stale branch.
- Apply operations from the changeset service always land on the session branch.
- Default branches (`main`, `master`, `develop`, anything the host marks as
  protected) are **read-only** to AutoDSM.

## Worktrees vs branches

Two valid topologies; pick by repo shape:

### Single working tree (default)

- Create branch with `git checkout -b autodsm/<thread-id>` at session start.
- Switch back to original branch on session end (unless user opts in to
  staying).

### Worktree (preferred for multi-session)

- Use `git worktree add` to give each session its own working directory.
- Path: `<repo>/.autodsm/worktrees/<thread-id>`.
- Tear down with `git worktree remove` on session end after merge or abandon.
- This avoids switching branches in the user's primary working tree.

A repo with uncommitted changes at session start prefers the **worktree** path
so we don't disturb the user's WIP.

## What "session start" means

The session begins when the user opens a new conversation/turn group that will
write to the repo. The git-engine:

1. Resolves the project root.
2. Confirms a clean enough state (or chooses worktree path).
3. Creates the session branch from default-branch HEAD.
4. Records the session anchor commit sha for rollback math.

## Apply flow on a session branch

`changeset.apply` calls the git-engine:

1. Ensure HEAD is on the session branch (or in the session worktree).
2. Stage written paths.
3. (Optional, opt-in) auto-commit with a deterministic message
   `chore(autodsm): apply ChangeSet <id>`.
4. Return the (optional) commit sha to `EditOutcome`.

Auto-commit is **off by default**. The user must opt in. Either way, **the
commit author is the user's git identity**, not AutoDSM.

## Multi-session repos

- Multiple sessions can run in parallel as long as each has its own worktree
  or branch. Sessions never share a branch.
- Cross-session merges are the user's responsibility; AutoDSM surfaces a "this
  session's branch diverged" warning if rebasing becomes necessary.

## Cleanup

- On session end with no changes: delete the branch / remove the worktree.
- On session end with applied changes: keep the branch; surface a PR offer.
- On session crash: branches persist (safety). The next session lists orphaned
  branches and offers cleanup.

## Anti-patterns

- ❌ Calling `git checkout main` from feature code mid-session.
- ❌ Writing to the working tree without ensuring HEAD is the session branch.
- ❌ Force-pushing or rewriting history on a session branch the user has touched.
- ❌ Hardcoding `main` as the default branch — read it from the repo.
- ❌ Using AutoDSM as the commit author. The user is the author, always.

## See also

- [`changeset-lifecycle.md`](./changeset-lifecycle.md) — what triggers writes.
- [`workflow/pr-conventions.md`](../workflow/pr-conventions.md) — what happens
  after the user accepts the session work.
