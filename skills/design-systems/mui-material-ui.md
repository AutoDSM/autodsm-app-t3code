# Material UI (MUI) — AutoDSM design system skill

## When to use

Load when implementing or repairing a workspace that targets **Material UI** (AutoDSM starter id **`mui`**), generating install/setup steps for an agent, or wiring the future **Components** tab / per-library agent to an MUI-based library.

## Canonical documentation

- Default install and peers: [Material UI — Installation](https://mui.com/material-ui/getting-started/installation/)
- **Default stack:** `@mui/material`, `@emotion/react`, `@emotion/styled` (Emotion is the default styling engine).
- Optional: **Roboto** via Fontsource or Google Fonts CDN; **icons:** `@mui/icons-material`.

## Stack assumptions

- **React** + **React DOM** as peers; Material UI v9 documents support for React 17–19 (verify current peer range on install if versions drift).
- **Vite + React** is a typical AutoDSM target; MUI works with Vite without Next.js-specific steps.

## Installation checklist (target workspace)

1. **Core packages**

   ```bash
   bun add @mui/material @emotion/react @emotion/styled
   ```

   (Use `npm` / `pnpm` / `yarn` if the workspace standard differs.)

2. **React 18 and below only (legacy note):** If the target uses React 18 or lower, follow MUI’s **`react-is` resolution** guidance in the same doc to avoid `react-is` / element identification mismatches. **React 19** workspaces (e.g. aligned with T3 Code `apps/web`) should follow current peer requirements only.

3. **Optional — Roboto (recommended for default typography):**

   ```bash
   bun add @fontsource/roboto
   ```

   Then import weights **300, 400, 500, 700** in the app entry (or use Google Fonts link in HTML) per the doc.

4. **Optional — icons:**

   ```bash
   bun add @mui/icons-material
   ```

5. **Provider wiring:** Wrap the app (or Storybook preview) with **`ThemeProvider`** + **`CssBaseline`** from `@mui/material` (or the scoped package paths your version recommends). Use a single theme object for tokens the design system owns.

6. **Styled-components (unusual):** Only if the workspace explicitly standardizes on styled-components: install `@mui/styled-engine-sc` and `styled-components` and follow MUI’s styled-components bundler guide; prefer **Emotion** for SSR-heavy or simpler setups.

7. **Verify:** Typecheck passes; no duplicate emotion instances (one version across the tree); theme and direction (LTR) set for Storybook previews.

## Coexistence and conflicts

- MUI brings **Emotion** runtime styling; combining with **Tailwind-first** shadcn workspaces in the **same package** is high-friction—prefer isolated AutoDSM workspaces per library flavor.
- **CDN install** is documented for prototyping only; avoid for production AutoDSM workspaces (bundle size and caching).

## AutoDSM mapping

- **Starter id:** `mui` (`autoDsmStarterCatalog`).
- **Artifacts:** `BrandProfile` should map to MUI theme overrides (palette, typography, shape); `ComponentRegistry` tracks exports and story paths for MUI-based components.

## Future: Components tab header + agent tab

- Health checks: **`@mui/material`** + Emotion deps present, `ThemeProvider` at preview root, theme file location convention documented for the agent.
- Agent prompts should default to **Emotion + `sx` / styled** patterns per MUI docs unless the repo explicitly uses the styled-engine swap.
- **WebContentsView preview:** keep interactive states (hover, focus, pressed) enabled; avoid `readOnly` / `disabled` unless demonstrating that state intentionally.
