# Testing

> Use this skill before claiming a change is "done." If your PR touches an
> area listed below, the corresponding tests are not optional.

## Test commands

- `bun typecheck` — must pass.
- `bun lint` — must pass.
- `bun fmt` — must pass (formatting is enforced).
- `bun run test` — runs Vitest. **Never `bun test`.**

## Test types

### Unit tests

- Co-located: `foo.ts` → `foo.test.ts`.
- Fast. No file I/O unless necessary; use the in-memory FS test helper.
- Run in `apps/server`, `apps/web`, `packages/contracts`, `packages/shared`.

### Schema round-trip tests

For each schema in `packages/contracts`:

- `Schema.encode(Schema.decode(payload))` round-trips for representative inputs.
- Decoders reject malformed inputs without throwing into application code.

### Service / integration tests

For each `apps/server` service:

- Behavior on happy path + at least one failure case per typed error.
- For services that own background lifecycles (provider sessions, indexer),
  test startup/teardown and restart semantics.

### Fixture repos

Render-runtime, scanner, and indexer tests use _fixture repos_ under
`apps/server/test/fixtures/` (or equivalent):

- One fixture per supported framework (`vite-react`, `next-app`, `next-pages`,
  `remix`, `astro-react`).
- One fixture per major provider pack permutation.
- Fixtures are _real_ mini-projects with `package.json` + a handful of
  components. Keep them small but representative.

Add a new fixture when you add a new pack or framework. Do not modify
existing fixtures for behavior — they are snapshots.

### Preview security tests

Live in `apps/<...>/test/preview-security/` (or equivalent). They cover the
non-negotiables:

- `contextIsolation`, `sandbox`, `nodeIntegration`, `webSecurity` set correctly
  on every view.
- Preview navigation: any non-loopback URL is denied.
- `webRequest`: non-loopback requests are cancelled.
- CSP headers present and correct on the preview document.
- `setWindowOpenHandler` denies by default.
- The UI renderer has no handle to the preview's `webContents`.

A PR that touches view creation, preload, CSP, navigation handlers, partitions,
or the sidecar bootstrap **must update** these tests or it does not merge.

### Render fidelity (golden screenshots)

Each pack + each canonical fixture has a small **golden set**: known
components rendered at known viewports/themes. A render-fidelity job:

1. Boots the sidecar against the fixture.
2. Renders the components per a fixed `RenderPlan` list.
3. Captures screenshots through the controller.
4. Compares against the on-disk golden via SSIM + pixel diff with the
   tolerance configured per fixture.

Goldens change deliberately. A "screenshots changed" PR explains _why_.

### End-to-end (e2e)

Run sparingly. Cover the **golden path** of the product loop:

- Open project → indexer ready → select component → propose change →
  preview render → accept ChangeSet → commit on session branch.
- Authentication flows for providers (mocked transports).

E2E tests are slow; treat regressions as severity-1.

## Coverage and what to skip

- Don't chase coverage numbers. Cover the **boundaries** (schemas, service
  entrypoints, preview security, golden screenshots).
- Generated code and trivial type wrappers don't need tests.
- UI snapshots are not a substitute for golden screenshots; they catch React
  output, not pixel output.

## Performance and flakiness

- If a test sleeps, it's wrong. Wait on events or use deterministic helpers.
- If a test hits the network, it's wrong. Mock at the boundary.
- Failing tests are bugs in the test or the code — never a "rerun" target.

## See also

- [`pr-conventions.md`](./pr-conventions.md) — what passes are required before
  PR.
- [`rendering/interaction-and-screenshots.md`](../rendering/interaction-and-screenshots.md)
  — determinism for goldens.
- [`architecture/security-model.md`](../architecture/security-model.md) —
  the invariants the preview-security suite checks.
