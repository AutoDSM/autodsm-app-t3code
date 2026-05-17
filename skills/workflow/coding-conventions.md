# Coding Conventions

> Use this skill when writing or reviewing code in this repo. These rules are
> the ones we keep tripping over, not generic style advice.

For the full repo expectations, also read `AGENTS.md` at the root.

## Effect services

We use `effect` for services in `apps/server` and main-process services. The
patterns we follow:

- **Service per domain.** One module exports the service tag, its
  `Effect.Service`-style implementation, and a typed Layer.
- **Inputs are parsed.** Public service methods accept already-parsed schema
  types, not raw JSON. Parsing is the boundary's job.
- **Errors are typed.** Don't `throw`. Use Effect's error channel with a
  union of named error tags.
- **No singletons.** Acquire services via `Layer`; do not import them directly
  from feature modules.

## Package boundaries

- `apps/server` and `apps/web` **never import each other**. They speak
  WebSocket, with payloads typed in `packages/contracts`.
- `packages/contracts` is **schema-only**. No runtime, no React.
- `packages/shared` is runtime-only. **No barrel index.** Use subpath exports
  like `@t3tools/shared/git`.
- Pulling a function into `packages/shared` requires it to be needed by _both_
  server and web. If only one needs it, keep it there.

## Typed contracts everywhere

Anything that crosses a process boundary has a schema in `packages/contracts`.
See [`architecture/rpc-and-contracts.md`](../architecture/rpc-and-contracts.md).

No untyped IPC. No `as any`. No JSON-as-source-of-truth fallback.

## No direct IPC for domain logic

The handler in `wsServer.ts` (or the RPC server) is a _parser-caller_. Real
logic lives in a service. If a handler grows past ~20 lines of behavior, that
behavior belongs in a service.

## Naming

- **Files:** `kebab-case.ts` for modules; `PascalCase.tsx` for React components.
- **Types/schemas:** PascalCase singular nouns (`ChangeSet`, `BrandProfile`).
- **IDs:** branded — `ChangeSetId`, `ProjectId`, `RenderManifestId`. Never
  bare `string`.
- **Events:** `<Domain>.<verb-past-tense>` — `changeset.applied`,
  `provider.streaming-stopped`.
- **Hooks:** `useX` returning typed result + typed error. No `any` in the
  return.
- **Constants:** `SCREAMING_SNAKE` only for true compile-time invariants.

## Async style

- Server / main: Effect first; raw promises only at framework boundaries.
- Web: React Query / Effect-Atom / hooks; do not hand-roll `useEffect` for
  network fetching when a typed hook already exists.

## Imports

- No `import * as X from 'y'` of internal modules.
- No re-exporting types from `packages/contracts` through shared barrels —
  import from the leaf module that defines them.
- Sort imports: built-ins → packages → local subpaths.

## React component conventions

- Component file exports default-named when matched to its filename.
- Props types named `<Component>Props`, exported when external.
- Memoization is an optimization, not a default. Profile first.
- Side effects in `useEffect` get a comment if **and only if** the cleanup is
  non-obvious (e.g., aborting an `AbortController` chained through a hook).
- No raw `ipcRenderer`. Use typed hooks/atoms.

## Files you should _not_ touch lightly

- Window/view creation in main.
- `wsServer.ts` route table — add via the schema → service → route recipe.
- `packages/contracts` — schema changes touch many consumers; respect versioning.
- Preview preload — security-critical.

## Testing requirements

- Every new service has unit tests.
- Every new contract has a schema round-trip test.
- Every UI hook has at least a sanity test for the typed return shape.
- See [`testing.md`](./testing.md) for the full obligations.

## What "good" looks like

A passing PR can be read top-to-bottom in 15 minutes by someone who has never
seen the feature. It names types precisely, parses at boundaries, surfaces
errors deliberately, and changes one thing.
