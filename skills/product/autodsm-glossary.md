# AutoDSM Glossary — Canonical Definitions

> Use this skill when you encounter an unfamiliar AutoDSM term, or when you're
> about to invent a new one. **Reuse existing terms before introducing new ones.**

These are the canonical names. If code or docs disagree, this file wins —
update the offending site in the same PR.

---

## Project & environment

### `ProjectProfile`

The static snapshot of _what kind of project this is_. Detected from
`package.json`, lockfiles, config files, and source layout.

- **Owner:** project-analysis service.
- **Inputs:** root path, package manager, framework markers, TS config, monorepo
  layout, style system markers.
- **Invalidation:** changes to `package.json`, lockfiles, `tsconfig*.json`,
  `vite.config*`, `tailwind.config*`, framework configs.
- **Consumers:** indexer, render-runtime, scanner, agent context.

### `RenderEnvironmentProfile`

The _render-side_ projection of `ProjectProfile`: what the sidecar Vite runtime
needs to mount a component faithfully — framework, package versions, style
toolchain, UI provider packs, router/query/state primitives.

- **Owner:** render-runtime service.
- **Invalidation key:** hash of `(ProjectProfile.versions, providerPacks,
styleConfig, env)`. See [render-environment-profile.md](../rendering/render-environment-profile.md).

### `BrandProfile`

Tokens of record: colors, typography, spacing, radii, shadows, semantic aliases.
Single source of truth for _what the brand is_, regardless of where tokens live.

- **Owner:** indexer (extracts), brand service (governs).
- **Invalidation:** Tailwind config, CSS variables, design-token files, MUI/Chakra
  theme files, explicit overrides in `BrandProfile.local.json`.

---

## Component model

### `ComponentRegistry`

The catalog of all components: id, path, exported symbols, prop schema, slot
shape, dependencies, usage map (`who calls Button?`), and source spans.

- **Owner:** indexer worker.
- **Invalidation:** TS/TSX file change in any component dir or its dependents.
- **Consumers:** workbench UI, render-runtime, scanner, agent context.

### `RenderPlan`

The deterministic spec produced by combining a component id + a chosen
`PreviewState` (props/slots/theme) + the `RenderEnvironmentProfile`. Inputs
that fully determine what the preview will render.

- **Owner:** render-runtime.
- **Consumers:** sidecar Vite bootstrap, screenshot pipeline.

### `RenderManifest`

The result of executing a `RenderPlan`: what was actually rendered, with module
graph, runtime warnings, captured errors, viewport/DPR/theme matrix outputs,
and any screenshot artifacts.

- **Owner:** render-runtime.
- **Consumers:** workbench UI, scan delta, screenshot diffing.

### `ProviderPack`

A declarative bundle that teaches the preview how to mount components from a
specific ecosystem: shadcn/Radix, MUI, Chakra, Mantine, AntD, Router, Query,
state libs. Includes provider hierarchy, theme wiring, and deterministic
ordering rules. See [provider-packs.md](../rendering/provider-packs.md).

---

## Agent & change pipeline

### `ScanArtifact`

The output of the scanner: violations with id, severity (`info` |
`warn` | `error`), location, rule, suggested fix (autofix hint), and a
content hash for caching.

- **Owner:** scanner worker.
- **Invalidation:** rule version + scanned-file hash.

### `GenerationPlan`

A provider-agnostic intermediate representation of an agent's proposed change.
Inputs to the agent prompt + the structured tool calls/outputs it produced.
**Not** disk writes — those happen via `ChangeSet`.

- **Owner:** agent-supervisor service.

### `ChangeSet`

The only legitimate way to mutate the user's source tree. A typed, addressable
collection of file operations (`create` | `update` | `delete` | `rename`) with
preview, validation, apply, and rollback. See
[changeset-lifecycle.md](../changeset/changeset-lifecycle.md).

- **Owner:** changeset service.
- **Consumers:** DiffPanel, git-engine, agent providers.

### `EditOutcome`

The post-apply record: which `ChangeSet` was applied, on which session branch,
the git commit (if any), scan deltas, render-manifest deltas, and the user's
disposition (`accepted` | `reverted` | `partial`).

- **Owner:** changeset service.
- **Consumers:** telemetry (opt-in), undo history, agent context (lightweight).

---

## Publishing

### `PublishedSnapshot`

An immutable, brand-book-shaped export of selected components + tokens at a
point in time. Explicitly user-published. Local-first: snapshots live on disk
unless the user opts into hosted publishing.

- **Owner:** publish service.
- **Invariant:** content-addressed. Never auto-mutated.

---

## Runtime topology terms

### `PreviewViewController`

The main-process object that owns a single preview `WebContentsView`: its
bounds, its `loadURL` to the sidecar, its `webContents.send` channel, its
diagnostics taps, and its lifecycle. The UI renderer never holds a direct
handle to the preview's `webContents`. See
[webcontentsview-renderer.md](../rendering/webcontentsview-renderer.md).

### `sidecar runtime` (a.k.a. _sidecar Vite runtime_)

The local Vite dev/preview server (loopback only) the preview view loads from.
Bootstraps the user's component graph under the configured `ProviderPack` stack
using the `RenderEnvironmentProfile`. Never exposes Node APIs to component
code; never accepts non-loopback requests.

---

## When you need a new term

1. Check this file. If a term _almost_ fits, prefer extending it over inventing.
2. If you truly need a new one, define it here in the same PR that introduces it.
3. Add the term as an artifact in
   [artifact-contracts.md](../architecture/artifact-contracts.md) if it crosses
   process boundaries.
