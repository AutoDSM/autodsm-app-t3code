# ChangeSet Lifecycle

> Load this skill before writing **anything** to the user's repo from a
> feature. There is exactly one legitimate path: create → preview → apply →
> rollback. No raw `fs.writeFile` on user paths from feature code.

## The path

```
create  →  preview  →  apply  →  (commit by user)
                    \↘ reject → rollback (no-op if not applied)
```

Each transition is a typed call into the changeset service. Each transition
emits typed events the UI and agent supervisor can subscribe to.

### 1. Create

```ts
changeset.create({
  projectId,
  intent: string,                 // human-readable purpose
  ops: ChangeOp[],                // typed, validated
})
→ ChangeSetId
```

- Ops are typed: `create | update | delete | rename`.
- Each op carries before/after **content hashes**; the service rejects ops whose
  `before` hash does not match the on-disk content.
- The service validates against the **protected paths** list (see below).
- Create is cheap; it does not touch the disk yet.

### 2. Preview

```ts
changeset.preview(id) → ChangeSetPreview
```

- Returns a structured diff (per-file hunks, summary stats, validation
  warnings).
- The DiffPanel renders this via the diff worker pool (see
  [`diff-rendering.md`](./diff-rendering.md)).
- The preview is **read-only** — calling preview multiple times is idempotent.

### 3. Apply

```ts
changeset.apply(id) → EditOutcome
```

- Pre-flight: re-validate `before` hashes; reject if drift.
- Write ops atomically (write to temp, fsync, rename; rollback on failure).
- Outcome carries the post-apply state: session branch ref, optional auto-commit
  sha, scan delta, render-manifest delta, disposition `partial` if some ops were
  skipped (e.g., a rename target already existed and the user chose to skip).

### 4. Rollback

```ts
changeset.rollback(id) → EditOutcome
```

- If not yet applied: no-op (returns a "no changes" outcome).
- If applied: restore using the `before` content snapshots captured at apply
  time. Rollback is bounded to the session — it does not re-introduce code that
  predates the session branch.

## Protected paths

These paths are **never** writable through a ChangeSet:

- The default branch of any repo (the _branch_, not the files). Writes happen
  on session branches; see
  [`branch-per-session.md`](./branch-per-session.md).
- `.git/**` (the git directory itself).
- `node_modules/**`, `dist/**`, `build/**`, `.next/**`, `.turbo/**`, `.cache/**`.
- Anything matching the user's `.autodsm/protected-paths.json` if present.
- Files outside the project root (no path traversal).

The protected-paths check runs at create time _and_ at apply time. Skipping
either is a bug.

## Validation

At create and apply time, the service validates:

- Every `before` hash matches.
- No op targets a protected path.
- Renames don't collide with existing files unless explicitly resolved.
- Total payload size is under the configured ceiling (sane bound, not an
  arbitrary limit; defaults to 5 MB per ChangeSet).
- Edits to files referenced by the `ComponentRegistry` carry an associated
  registry invalidation note (so consumers re-index promptly).

## Eventing

The service emits typed events on a `ChangeSetEvent` channel:

- `created`, `previewed`, `applying`, `applied`, `apply-failed`, `rolled-back`.

These events feed the agent supervisor (to confirm a turn closed), the diff UI
(to refresh), and telemetry (opt-in).

## Anti-patterns

- ❌ `fs.writeFileSync(path, content)` from anywhere in feature code.
- ❌ Patching the working tree via `git` shell calls in feature code.
- ❌ Mutating a ChangeSet after creation. Create a new one.
- ❌ Skipping `before` hash validation because "we just read the file."
- ❌ Applying without writing an `EditOutcome`.

## See also

- [`branch-per-session.md`](./branch-per-session.md) — where applies happen.
- [`diff-rendering.md`](./diff-rendering.md) — how previews surface in the UI.
- [`architecture/artifact-contracts.md`](../architecture/artifact-contracts.md)
  — full ChangeSet and EditOutcome schemas.
