# Diff Rendering (DiffPanel & DiffWorkerPool)

> Use this skill when surfacing a ChangeSet visually, adding new diff actions
> (revert hunk, accept hunk), or wiring a new producer of diffs into the UI.

## Reuse, don't reinvent

T3Code already ships `DiffPanel` and a worker pool for diffs (`DiffWorkerPoolProvider`).
**Reuse them.** New diff features integrate by:

- Producing a typed payload (ChangeSet preview from
  [`changeset-lifecycle.md`](./changeset-lifecycle.md)).
- Mapping it to the shape DiffPanel already consumes.
- Adding actions via the existing panel's extensibility surface, not by
  forking a parallel renderer.

If the existing panel does not fit, the right move is to **extend** it (and
update this doc), not to ship a second one.

## Shape DiffPanel wants

The panel consumes a list of file-level diffs with hunks:

```ts
type ChangeSetPreviewView = {
  changeSetId: ChangeSetId;
  files: Array<{
    path: string;
    status: "create" | "update" | "delete" | "rename";
    fromPath?: string;
    hunks: Hunk[];
    warnings?: ValidationWarning[];
  }>;
  stats: { filesChanged: number; insertions: number; deletions: number };
};
```

Map the `ChangeSetPreview` artifact to this view in a thin adapter — not in the
panel itself.

## Worker pool

Diffs are computed off the main UI thread. The `DiffWorkerPoolProvider`:

- Takes `(beforeContent, afterContent, language hint)`.
- Returns hunks.
- Coalesces identical requests across files.
- Caches by `(beforeHash, afterHash, options)`.

Do not call diff libraries directly from React components. Use the provider's
hook.

## Actions on diffs

Actions exposed through DiffPanel:

- **Accept whole ChangeSet** → `changeset.apply(id)`.
- **Reject** → discards; emits a `rolled-back` event so the agent supervisor
  knows the turn closed negatively.
- **Per-hunk accept/reject** (where the producer supports it) → results in a
  derived ChangeSet via `changeset.deriveSubset(id, hunkSelection)` that is
  then applied. The original ChangeSet is not mutated.
- **Open in editor** → opens the file at the hunk's range via the host's
  `shell.openPath` (UI shell only; preview process never does this).

Buttons surface typed intents; actions reach services via typed RPC, not
direct module calls.

## Empty / large / binary

- Empty diffs surface a friendly placeholder, never throw.
- Large diffs (> N MB rendered) virtualize at the file list level and lazy-render
  hunks on scroll.
- Binary files show a "binary changed" indicator with size before/after; no
  byte rendering.

## Anti-patterns

- ❌ Computing diffs inside React render.
- ❌ Forking a second diff panel for a "slightly different" use case.
- ❌ Mutating the upstream ChangeSet from the UI.
- ❌ Calling `changeset.apply` from a click handler without confirming the
  current ChangeSet id matches what the user sees (race-safety).

## See also

- [`changeset-lifecycle.md`](./changeset-lifecycle.md)
- [`workflow/pr-conventions.md`](../workflow/pr-conventions.md)
