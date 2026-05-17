# Artifact Contracts

> Every AutoDSM payload that crosses a process boundary is an **artifact**.
> Artifacts have an owner, an invalidation key, a versioned schema, and a list
> of consumers. If you can't write those four lines, you don't have an
> artifact — you have a bug.

For schema mechanics, see [`rpc-and-contracts.md`](./rpc-and-contracts.md).
For naming, see [`product/autodsm-glossary.md`](../product/autodsm-glossary.md).

## The four required fields

| Field            | Rule                                                                                              |
| ---------------- | ------------------------------------------------------------------------------------------------- |
| **Owner**        | One service writes it. Everyone else reads.                                                       |
| **Invalidation** | A deterministic key from inputs. Caches must compute it; consumers must not assume freshness.     |
| **Schema**       | `effect/Schema` in `packages/contracts`. Branded IDs. Versioned with a `kind` discriminator.      |
| **Consumers**    | Listed explicitly. If a new consumer appears, update this doc and the owner's invalidation logic. |

## Artifact ownership table

### `BrandProfile`

- **Owner:** indexer (extracts), brand-service (governs).
- **Invalidation:** hash of `(tailwind.config*, design-token files, CSS variable
files, BrandProfile.local.json overrides)`.
- **Schema rules:** tokens are canonical; aliases resolve at read; never store
  computed colors — compute on demand from canonical primitives.
- **Consumers:** workbench UI, render-runtime, scanner (drift), publish.

### `ComponentRegistry`

- **Owner:** indexer worker.
- **Invalidation:** hash of `(component file mtimes + dependency closure +
parser version)`. Use a content hash for the dependency closure, not a
  modification time.
- **Schema rules:** components carry id, path, exported symbols, prop schema,
  slot shape, dependency edges, usage map. Source spans are character offsets,
  not line numbers.
- **Consumers:** workbench UI, render-runtime, scanner, agent context.

### `RenderEnvironmentProfile`

- **Owner:** render-runtime.
- **Invalidation:** `hash(ProjectProfile.versions, providerPacks, styleConfig,
env-allowlist, sidecar-version)`.
- **Schema rules:** declarative pack list with deterministic ordering. No
  reference to absolute paths; everything is relative to project root.
- **Consumers:** sidecar runtime bootstrap, screenshot pipeline, agent context
  (slice).

### `RenderManifest`

- **Owner:** render-runtime.
- **Invalidation:** content-addressed by `(RenderPlan hash + sidecar version +
pack versions)`. A manifest is immutable.
- **Schema rules:** records which modules loaded, captured runtime errors,
  viewport/DPR/theme matrix used, attached screenshots (by id, not blob).
- **Consumers:** workbench UI, scan delta, screenshot diffing, agent context.

### `ScanArtifact`

- **Owner:** scanner worker.
- **Invalidation:** `(rule version + scanned-file content hash + axe-core
ruleset version)`.
- **Schema rules:** each violation has `id`, `severity` (`info` | `warn` |
  `error`), `location` (file + range), `ruleId`, optional `autofix` hint.
  Severities are a closed enum.
- **Consumers:** workbench UI, agent context, governance gates, drift dashboard.

### `GenerationPlan`

- **Owner:** agent-supervisor.
- **Invalidation:** not cached; ephemeral per turn.
- **Schema rules:** records the assembled prompt sections, tool calls, raw
  provider events (typed), and the proposed ops. Provider-agnostic.
- **Consumers:** changeset service (consumes), conversation UX (renders),
  telemetry (opt-in).

### `ChangeSet`

- **Owner:** changeset service.
- **Invalidation:** content-addressed by ops. Apply is idempotent given the
  same head commit.
- **Schema rules:** ops are typed (`create` | `update` | `delete` | `rename`).
  Each op carries before/after content hashes. Protected paths are enforced at
  validate time. See
  [`changeset/changeset-lifecycle.md`](../changeset/changeset-lifecycle.md).
- **Consumers:** DiffPanel, git-engine, agent providers (read-only after creation).

### `EditOutcome`

- **Owner:** changeset service.
- **Invalidation:** append-only history; never mutated.
- **Schema rules:** records `ChangeSetId`, session branch ref, applied commit
  sha (nullable), scan delta summary, manifest delta summary, user disposition
  (`accepted` | `reverted` | `partial`).
- **Consumers:** undo history, agent context (lightweight summary only),
  telemetry (opt-in).

### `PublishedSnapshot`

- **Owner:** publish service.
- **Invalidation:** content-addressed; immutable once written.
- **Schema rules:** carries the BrandProfile, selected components,
  RenderManifests, and a deterministic manifest of asset hashes. Snapshots are
  local-first; hosted publishing is explicit and opt-in.
- **Consumers:** brand book viewer, hosted publish path (when enabled).

## How to add a new artifact

1. Write the four lines (owner, invalidation, schema, consumers) in this file.
2. Add the schema to `packages/contracts` with branded IDs.
3. Implement the owner service; have it compute the invalidation key.
4. Wire consumers via typed hooks/atoms; never reach across owners.
5. Add fixtures + tests. Artifacts that lack fixtures regress silently.

## How to _retire_ an artifact

- Mark it deprecated in this file with a date and migration target.
- Keep the schema for two minor versions before removal.
- Update every consumer in the same PR sequence; do not leave half-migrated
  consumers reading stale shapes.
