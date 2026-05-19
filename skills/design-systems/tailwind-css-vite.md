# Tailwind CSS (Vite) — AutoDSM design system skill

## When to use

Load when implementing or repairing a **Tailwind-first** workspace without necessarily using shadcn’s CLI (AutoDSM starter id **`tailwind-css`**), adding Tailwind to a Vite + React library, or verifying Tailwind setup for preview/Storybook. Also load when agents must align with the **official Vite plugin** flow used by T3 Code `apps/web` (Tailwind v4 + `@tailwindcss/vite`).

## Canonical documentation

- **Vite plugin install:** [Tailwind CSS — Using Vite](https://tailwindcss.com/docs/installation/using-vite)

## Stack assumptions

- **Vite** as the bundler; **Tailwind v4** with the **`@tailwindcss/vite`** plugin (per current docs).
- **Component-only libraries** still need a CSS entry imported from app/preview (Storybook `preview.ts`, dev entry, or package `styles.css`).

## Installation checklist (target workspace)

1. **Packages**

   ```bash
   bun add -D tailwindcss @tailwindcss/vite
   ```

   (If the repo catalogs versions like T3 Code, align majors with the monorepo catalog.)

2. **Vite config:** Register the plugin:

   ```ts
   import tailwindcss from "@tailwindcss/vite";

   export default defineConfig({
     plugins: [tailwindcss() /* react(), ... */],
   });
   ```

3. **CSS entry:** In the main CSS file (e.g. `src/index.css`):

   ```css
   @import "tailwindcss";
   ```

   Ensure this file is imported from the app entry (or Storybook preview).

4. **Content / scanning:** Tailwind v4 discovers sources via the build graph; if anything is not picked up, use `@source` or the v4-equivalent directives from the docs for explicit globs.

5. **Verify:** Run `vite dev`; utilities apply; no second conflicting PostCSS Tailwind pipeline unless intentional.

## Relation to shadcn/ui

- **shadcn workspaces are Tailwind workspaces.** If the starter is **`shadcn-ui`**, load **`shadcn-ui.md`** first; use this skill for **Tailwind-only** or **utility-first** baselines (starter id **`tailwind-css`**) without shadcn component copy.

## Coexistence and conflicts

- **One** Tailwind pipeline per Vite config is the default; duplicate `@tailwindcss/vite` + legacy PostCSS `tailwindcss` can cause subtle ordering bugs—investigate before stacking.
- **MUI/Chakra** can coexist in monorepos at **package boundaries**; in a single design-system package prefer either utility-first Tailwind **or** a component library’s runtime styling, not both as equals.

## AutoDSM mapping

- **Starter id:** `tailwind-css` (`autoDsmStarterCatalog`).
- **Artifacts:** `BrandProfile` drives CSS variables / `@theme` extensions; `TokenStore` / export pipeline should emit Tailwind-facing token outputs where the architecture defines them.

## Future: Components tab header + agent tab

- Health checks: **`tailwindcss`**, **`@tailwindcss/vite`** in `devDependencies`, plugin in `vite.config`, `@import "tailwindcss"` in the CSS entry imported by preview.
- For T3 Code monorepo parity, compare against **`apps/web`** (`@tailwindcss/vite`, Tailwind v4).
- **WebContentsView preview:** keep interactive states (hover, focus, typing) enabled; avoid `readOnly` / `disabled` unless demonstrating that state intentionally.
