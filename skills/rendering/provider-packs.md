# Provider Packs

> Use this skill when adding support for a new component ecosystem (shadcn,
> MUI, Chakra, Mantine, AntD, Router, Query, state libs), or when changing
> the order in which providers wrap user components in the preview.

A **ProviderPack** is a declarative bundle that teaches the preview how to
mount components from a specific ecosystem. Packs are deterministic, ordered,
and overridable by the user.

## Pack catalog (canonical)

| Pack id                | What it provides                                                      |
| ---------------------- | --------------------------------------------------------------------- |
| `pack:shadcn-radix`    | Radix primitives, `cn()`/`tailwind-merge`, theme tokens via Tailwind  |
| `pack:mui`             | `ThemeProvider`, `CssBaseline`, emotion cache                         |
| `pack:chakra`          | `ChakraProvider`, theme, color-mode manager                           |
| `pack:mantine`         | `MantineProvider`, `Notifications`, `ColorSchemeProvider`             |
| `pack:antd`            | `ConfigProvider`, theme tokens, locale                                |
| `pack:react-router`    | `MemoryRouter` (default) or `BrowserRouter` (when explicitly enabled) |
| `pack:next-router`     | App-router or pages-router shim with deterministic mock route         |
| `pack:tanstack-router` | `RouterProvider` with a synthesized in-memory router                  |
| `pack:react-query`     | `QueryClientProvider` with a per-render `QueryClient`                 |
| `pack:swr`             | `SWRConfig` with offline-by-default fetcher                           |
| `pack:redux`           | `Provider` with a per-render store seeded from `previewState.store`   |
| `pack:zustand`         | Per-render store init via `previewState.store`                        |
| `pack:jotai`           | `Provider` with a per-render atom store                               |
| `pack:recoil`          | `RecoilRoot` with `initializeState`                                   |

A pack is a small module exporting:

```ts
export interface ProviderPack {
  id: ProviderPackId;
  layer: ProviderLayer; // ordering hint
  match: (rep: REP) => boolean; // detection signal
  Provider: (props: { children: ReactNode; state?: PreviewState }) => JSX.Element;
  beforeMount?: (state: PreviewState) => void;
  afterMount?: (state: PreviewState) => void;
}
```

## Deterministic ordering

Providers wrap user components in a **fixed layered order**. Within a layer,
packs are ordered alphabetically by id. This rule exists so that the same
project always renders with the same provider tree.

Layers, outermost → innermost:

1. **theme** — Theme/css-baseline/color-mode providers (MUI, Chakra, Mantine,
   AntD, shadcn theme).
2. **i18n** — locale providers.
3. **router** — exactly one router pack (mutually exclusive across react-router,
   next-router, tanstack-router).
4. **data** — query/data-layer providers (react-query, swr, urql).
5. **state** — state libraries (redux, zustand, jotai, recoil).
6. **portals** — Notifications, toasts, modals roots.
7. **component** — the user component under test.

The wrap order is enforced by a single composition function in the sidecar
runtime. Feature code does not re-order providers; it adds packs to layers.

## How to write a new pack

1. **Detect** — implement `match(rep)`. Detection must be pure, fast, and based
   on the REP, not on running project code.
2. **Place** — pick the correct `layer`. If your pack arguably belongs in two
   layers, you have two packs.
3. **Provider component** — accepts a `previewState` (seeded by the workbench)
   and exposes a documented contract: which keys it reads.
4. **Lifecycle hooks** — use `beforeMount`/`afterMount` for side-effecty setup
   (e.g., setting a window-level locale). Reset cleanly on unmount.
5. **Register** — add the pack to the catalog with deterministic id and to the
   REP detection map. Update [`autodsm-glossary.md`](../product/autodsm-glossary.md)
   if you introduce new terminology.
6. **Tests** — render fixtures with the pack on and off; assert the provider
   tree shape is stable across runs.

## User overrides

`.autodsm/RenderEnvironmentProfile.local.json`:

```jsonc
{
  "providerPacks": ["pack:shadcn-radix", "pack:react-query"],
}
```

- Overrides **augment** detection by default.
- A pack with `!` prefix disables an otherwise-detected pack:
  `["!pack:next-router", "pack:react-router"]`.
- Conflicts (e.g., two router packs) raise a validation artifact; the user must
  resolve.

## Anti-patterns

- ❌ Calling `Math.random()` or reading `Date.now()` in provider initialization.
  Providers must be deterministic given a `previewState`.
- ❌ Hand-ordering packs inside feature code. Order is global.
- ❌ Coupling a pack to a specific component implementation.
- ❌ Reading from non-allowlisted env vars.
- ❌ Adding a pack that _also_ tries to be the user's component (e.g., includes
  AntD components by default).

## See also

- [`render-environment-profile.md`](./render-environment-profile.md) — how packs
  are detected and cached.
- [`safe-runtime.md`](./safe-runtime.md) — runtime constraints in the preview.
