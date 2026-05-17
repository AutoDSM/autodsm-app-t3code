# Provider Driver Integration

> Use this skill when wiring or modifying a provider driver (Claude, Codex,
> OpenCode, Cursor). The single most important rule: **provider tools never
> apply changes directly. They emit ChangeSet proposals that the user
> reviews.**

## The contract

A provider driver takes:

- a provider-agnostic `GenerationPlan` (see
  [`agent-context-assembly.md`](./agent-context-assembly.md)),
- provider credentials (resolved by the main-process `CredentialResolver`),

and produces:

- a stream of typed events the conversation UX renders,
- a `ChangeSetProposal` (or several) at the end of the turn,
- a typed turn outcome (`completed | aborted | failed`).

Drivers are _adapters_. The supervisor orchestrates turns; drivers do the
wire-format work for a specific provider.

## Where drivers live

- Long-lived provider sessions are managed by
  `apps/server/src/providerManager.ts`.
- Codex specifically is brokered via
  `apps/server/src/codexAppServerManager.ts` (JSON-RPC over stdio).
- Each driver implements the provider interface from `packages/contracts`.

## Tool design: propose, don't write

A driver may expose tools to the model. Tools that mutate the repo:

- ❌ Do not call `fs` directly.
- ❌ Do not call `git` directly.
- ✅ Emit a `ChangeOp` into a `ChangeSetProposal`.
- ✅ Validate paths and content against the protected-paths list before
  emitting.

Read-only tools (search, get usage, run scan, get render manifest) are
allowed and encouraged; they reduce the need to pre-pad the context.

## Per-provider notes

### Claude (Anthropic SDK)

- Use prompt caching for the stable prompt prefix (system + environment +
  brand slices). The supervisor orders slices specifically to make this
  effective; the driver should set cache breakpoints accordingly.
- Tool definitions are stable; cache them.
- Model selection respects user setting; default to the latest Sonnet for cost
  efficiency on standard turns and the latest Opus for higher-stakes turns.

### Codex (app-server)

- Lifecycle: start `codex app-server` per provider session (already brokered
  in `codexAppServerManager.ts`). Stream JSON-RPC events into typed
  `orchestration.domainEvent` push messages.
- Session resume must restore: session id, model, conversation tail, and the
  `GenerationPlan` slices that are still relevant.

### OpenCode / Cursor (CLI providers)

- Spawn as child processes. Capture stdout/stderr with the redactor in place;
  no secrets in logs.
- Translate provider events into the same typed event stream the UI expects.
- If a CLI provider attempts to write to disk (e.g., as part of its native
  flow), intercept and convert to a `ChangeSetProposal`. If the provider does
  not support a non-writing mode, configure it to write into a scratch
  directory we treat as proposal input.

## Event taxonomy (provider-agnostic)

Drivers emit typed events the conversation UX understands:

- `turn.started`, `turn.completed`, `turn.failed`, `turn.aborted`
- `tool.requested`, `tool.completed`, `tool.failed`
- `proposal.opened`, `proposal.updated`, `proposal.closed`
- `message.chunk` (model text), `message.finalized`
- `error` (typed; never raw exception text — must be classified)

## Credentials

- Resolved through `CredentialResolver` in main; never read by drivers from
  env directly.
- Drivers receive a typed `CredentialHandle`, not raw tokens.
- Tokens never appear in logs, telemetry, stderr captures, or crash reports.

## Failure modes

- Network failures: retry with bounded backoff; surface `turn.failed` if the
  budget exhausts.
- Provider-side rate limits: surface as a typed error with a recommended
  cooldown; the UI shows a friendly state.
- Partial proposals: if a turn produces a partial `ChangeSetProposal` before
  failing, still hand it to the changeset service so the user can decide.

## Anti-patterns

- ❌ A tool that takes `string` and runs it as shell on the host.
- ❌ A driver that decides to commit on the user's behalf.
- ❌ A driver that reads files outside the project root.
- ❌ Driver-specific UI logic. UI is provider-agnostic.
- ❌ Embedding provider SDKs in `packages/contracts` (it's schema-only).

## See also

- [`agent-context-assembly.md`](./agent-context-assembly.md)
- [`prompt-budget.md`](./prompt-budget.md)
- [`changeset/changeset-lifecycle.md`](../changeset/changeset-lifecycle.md)
- [`architecture/security-model.md`](../architecture/security-model.md) — secret handling
