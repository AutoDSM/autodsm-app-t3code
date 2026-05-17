# PR Conventions

> Use this skill when opening, updating, or reviewing a pull request. Keep
> PRs small, named clearly, and verifiable.

## Branch names

- Application work: `feat/<area>-<short-slug>` or `fix/<area>-<slug>`.
  - Examples: `feat/preview-bounds-debounce`, `fix/changeset-rollback-on-rename`.
- Refactors: `refactor/<area>-<slug>`.
- Docs/skills: `docs/<area>-<slug>`.
- Agent session branches managed by the app: `autodsm/<thread-id>` — these are
  _not_ PR branches. They land on a PR branch via the user's normal workflow.

Branch names use lowercase, hyphens, no slashes inside `<slug>`.

## PR title

- Short: under 70 characters.
- Imperative: "Add preview-bounds debounce in main."
- Prefix optional but encouraged for scanning: `feat:`, `fix:`, `refactor:`,
  `docs:`, `chore:`.

## PR body — required sections

### Summary

1–4 bullets, written so a reviewer who has never touched the area can decide
"is this safe?" in under a minute.

- _Why_: what problem this solves.
- _What_: concretely, what changed (the moving parts, not a line count).
- _Risk_: anything load-bearing — security, schema versioning, perf — flagged
  explicitly.

### Testing / Verification checklist

A real checklist, not boilerplate. Tick what was actually done. Examples:

- [ ] `bun typecheck` passes locally.
- [ ] `bun lint` passes locally.
- [ ] `bun fmt` is clean.
- [ ] `bun run test` passes locally.
- [ ] Preview security tests updated (if view/preload/CSP touched).
- [ ] Golden screenshots regenerated and reviewed (if render path touched).
- [ ] Manually verified the feature in `apps/web` against fixture `<name>`.
- [ ] No new untyped IPC; schemas land in `packages/contracts`.

Replace any bullet with N/A only if it truly does not apply.

### Screenshots / videos

For any UI change: include before/after screenshots. For preview-pane changes,
include a short capture of the live render (a `.png` or `.gif` is fine).

### Schema / contract changes

If `packages/contracts` changed:

- Note the bumped version (we version schemas, see
  [`architecture/artifact-contracts.md`](../architecture/artifact-contracts.md)).
- Note every consumer updated (or explicitly defer with a follow-up task).

### Migration / data

If on-disk artifact format changed:

- Describe the migration path (or "no migration; cache rebuilds on first run").
- Confirm no protected-paths violation in the migration script.

## What gets rejected on sight

- Untyped IPC, untyped tool definitions, `as any` in service code.
- New raw `fs.writeFile` on user paths from feature code.
- Disabling Electron security defaults (contextIsolation, sandbox, etc.).
- Diff that mixes refactor with feature with no separable history.
- Goldens updated without text explaining why.
- "Verification done" without listing what was verified.

## Reviewer expectations

- Code review checks **security invariants** first
  ([`architecture/security-model.md`](../architecture/security-model.md)),
  then schema correctness, then logic.
- For preview-related PRs, reviewers should actually run the preview against a
  fixture before approving.
- Approve only after the testing checklist is real. If items are N/A, that's
  fine; if they're blank, ask.

## See also

- [`coding-conventions.md`](./coding-conventions.md)
- [`testing.md`](./testing.md)
- [`changeset/branch-per-session.md`](../changeset/branch-per-session.md)
