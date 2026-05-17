# RenderEnvironmentProfile — Detection & Cache Invalidation

> Use this skill when changing how AutoDSM detects what a project is, picks
> provider packs, or decides when to invalidate a cached render setup.

The `RenderEnvironmentProfile` (REP) is the _render-side projection of
`ProjectProfile`_: everything the sidecar needs to mount a component
faithfully — framework, package versions, style toolchain, UI provider packs,
router/query/state primitives.

## What the REP contains

```
RenderEnvironmentProfile {
  framework: 'next' | 'vite-react' | 'remix' | 'astro-react' | …
  packageManager: 'bun' | 'pnpm' | 'yarn' | 'npm'
  versions: { react, reactDom, typescript, vite?, next?, … }
  styleSystem: { tailwind?, cssModules?, vanillaExtract?, emotion?, styledComponents?, … }
  providerPacks: ProviderPackId[]      // deterministic order
  routerKind: 'react-router' | 'next-app' | 'next-pages' | 'tanstack' | 'none'
  dataLayer: ('react-query' | 'swr' | 'rtk-query' | 'urql' | 'none')[]
  stateLibs: ('redux' | 'zustand' | 'jotai' | 'recoil')[]
  envAllowlist: string[]                // safe to expose to preview
  sidecarVersion: string                // pinned per release
}
```

The REP is **deterministic from its inputs**. Same inputs ⇒ same profile ⇒
same render result.

## Detection rules

Detection runs in the project-analysis service, off the main thread. Detection
_must_ be cheap (small file reads, package-manifest parsing) and _must not_
execute project code.

### Framework

- `next` package present → `next` (sub-distinguish `pages` vs `app`).
- `astro` present → `astro-react` if React adapter is wired.
- `@remix-run/react` present → `remix`.
- Vite + React entry → `vite-react`.
- Fall back to `vite-react` with a warning if React is present but no toolchain.

### Style system

- Detect `tailwindcss` in deps + `tailwind.config.*` present.
- CSS Modules: presence of `.module.css` files in source.
- vanilla-extract, Emotion, styled-components: dependency presence + sentinel
  config files. Multiple may co-exist; record all.

### Provider stack

- Map known dependencies to `ProviderPackId`s
  (e.g., `@radix-ui/react-*` + `class-variance-authority` + `tailwind-merge` →
  `pack:shadcn-radix`).
- See [`provider-packs.md`](./provider-packs.md) for the full catalog and the
  deterministic ordering rules.

### Router / data / state

- Probe imports rather than just `package.json`: a dependency that's installed
  but unused should not appear in the REP.

## Invalidation key

```
hash(
  ProjectProfile.versions,
  providerPacks (order matters),
  styleSystem,
  envAllowlist,
  sidecarVersion,
)
```

When the key changes, the sidecar runtime is recreated. Everything else in the
session is preserved.

### What triggers a re-detection

- `package.json` or lockfile change
- `tsconfig*.json` change
- Framework configs: `next.config.*`, `vite.config.*`, `astro.config.*`,
  `remix.config.*`
- Tailwind / style-system configs
- Explicit user override file: `.autodsm/RenderEnvironmentProfile.local.json`

### What does _not_ trigger re-detection

- Source file edits inside `src/` (component HMR handles those).
- Lockfile metadata changes that don't alter resolved versions.
- User opening another file in the workbench.

## User overrides

Users may pin or augment with `.autodsm/RenderEnvironmentProfile.local.json`:

```jsonc
{
  "providerPacks": ["pack:shadcn-radix", "pack:react-query"],
  "envAllowlist": ["NEXT_PUBLIC_APP_NAME"],
}
```

- Overrides **add** to the detected REP unless prefixed with `!`.
- An override that contradicts detected state surfaces a warning artifact;
  detection does not silently lose.

## Anti-patterns

- ❌ Executing project code to detect frameworks. (Static reads only.)
- ❌ Reading environment variables not on `envAllowlist` into the preview.
- ❌ Caching the REP keyed by project path alone — the key is structural.
- ❌ Letting unused dependencies leak into provider stacks.
- ❌ Hand-merging detection + overrides in feature code. There is one merge
  function; reuse it.

## See also

- [`provider-packs.md`](./provider-packs.md) — pack catalog and ordering.
- [`safe-runtime.md`](./safe-runtime.md) — sidecar bootstrap constraints.
- [`architecture/artifact-contracts.md`](../architecture/artifact-contracts.md)
  — full REP schema obligations.
