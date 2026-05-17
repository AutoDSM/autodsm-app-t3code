# RPC and Contracts — Adding a Cross-Process Payload

> Use this skill any time data crosses a process boundary: main ↔ renderer,
> renderer ↔ server, main ↔ worker, sidecar → main. Every cross-boundary
> payload **must** start with a schema in `packages/contracts`. There is no
> "we'll type it later" path.

## Where contracts live

- **`packages/contracts`** — `effect/Schema` definitions, branded types, and
  shared discriminated unions. **Schema-only. No runtime logic.**
- **`packages/shared`** — small runtime utilities consumed by both server and
  web (e.g. git helpers). Use explicit subpath exports, no barrel index.
- **`apps/server`** — services, RPC handlers, provider integrations.
- **`apps/web`** — React UI, hooks/atoms, DiffPanel, conversation rendering.

## The five-step recipe (memorize this)

To add a new typed payload that crosses processes, follow these steps in order
and never skip:

### 1. Schema in `packages/contracts`

Define request, response, and event schemas with `effect/Schema`. Brand IDs.
Use discriminated unions for variants; never `unknown` or untyped maps. Export
a single named module per domain (e.g. `ChangeSetContract.ts`).

```ts
// packages/contracts/src/ChangeSetContract.ts
import { Schema as S } from "effect";

export const ChangeSetId = S.String.pipe(S.brand("ChangeSetId"));

export const CreateChangeSet = S.Struct({
  projectId: S.String.pipe(S.brand("ProjectId")),
  intent: S.String,
  ops: S.Array(/* op schema */),
});

export const CreateChangeSetResponse = S.Struct({
  id: ChangeSetId,
});
```

Run `bun typecheck` to verify cross-package wiring.

### 2. Server-side service in `apps/server`

Implement an Effect-style service that **consumes the schema's parsed type**,
not raw JSON. The service is what holds the business logic. RPC handlers are
thin: parse → call service → serialize.

```ts
// apps/server/src/services/ChangeSetService.ts
export const ChangeSetService = { create: (input) => ... }
```

Do not put business logic in the WS route or IPC handler.

### 3. RPC route or main-process atom

- **Server (WS):** add a route in `apps/server/src/wsServer.ts` (or its
  successor) that:
  1. `Schema.decodeUnknownSync(CreateChangeSet)` the inbound payload,
  2. calls the service,
  3. encodes the response with `Schema.encodeSync(CreateChangeSetResponse)`.
- **Main process:** wire the handler in the typed RPC server. Use
  `Schema.decode...` at the entrypoint. Never `as any`.

A handler that doesn't validate is a bug. Mismatches are logged + dropped, not
thrown into UI.

### 4. Renderer hook / atom

Expose a small typed hook in the renderer that calls the RPC and surfaces:

- loading state,
- typed result,
- typed error (`Schema.Either` or `Effect.Effect<E, A>`),
- a stable identity (memoizable).

The hook should not unwrap raw responses; it should return the parsed schema
type and forward errors to a typed error channel.

### 5. Tests

- **Schema round-trip test** in `packages/contracts`: encode → decode → equal.
- **Service unit test** in `apps/server`: behavior, error cases, idempotency.
- **Integration test** that drives the WS or RPC handler end-to-end with a
  realistic payload.
- If the payload is an **artifact** (see
  [`artifact-contracts.md`](./artifact-contracts.md)), add a fixture in the
  test fixtures repo.

## Naming and shape conventions

- Request schemas: imperative noun phrase — `CreateChangeSet`, `RunScan`,
  `OpenProject`.
- Response schemas: `<Request>Response`.
- Events (server → client push): `<Domain>Event` discriminated by `kind`.
- IDs are _branded_: `ChangeSetId`, `ProjectId`, `RenderManifestId`. Never bare
  `string`.
- Avoid optional fields where a discriminated union expresses intent more
  clearly.

## AutoDSM payloads MUST be artifacts

Any AutoDSM domain payload that crosses processes is an _artifact_ with:

- a canonical owner,
- an invalidation key,
- a versioned schema,
- consumers listed.

If you can't write those four lines, you're not designing an artifact — you're
designing a bug. Read [`artifact-contracts.md`](./artifact-contracts.md) first.

## Anti-patterns

- ❌ `ipcMain.handle('do-thing', (_, payload) => doThing(payload))` with no
  schema.
- ❌ Sending a `Map`, `Date`, `Set`, or class instance over IPC.
- ❌ Reusing a schema "close enough" instead of adding the right one.
- ❌ Putting logic in `wsServer.ts` to avoid creating a service.
- ❌ Importing `apps/server` code from `apps/web` or vice versa.
- ❌ Schemas defined inline in handlers (they belong in `packages/contracts`).

## Useful pointers in the current repo

- WS routes: `apps/server/src/wsServer.ts`
- Provider session manager: `apps/server/src/providerManager.ts`
- Codex app-server brokering: `apps/server/src/codexAppServerManager.ts`
- Contracts package: `packages/contracts/`
- Shared runtime utils: `packages/shared/` (subpath exports only)
