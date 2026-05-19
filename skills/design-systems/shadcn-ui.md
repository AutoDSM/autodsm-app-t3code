# shadcn/ui — AutoDSM design system skill

## When to use

Load when implementing or repairing a workspace that targets **shadcn/ui** (AutoDSM starter id **`shadcn-ui`**), generating install/setup steps for an agent, or wiring the future **Components** tab / per-library agent to a shadcn-based library.

## Canonical documentation

- Installation and CLI: [shadcn/ui — Installation](https://ui.shadcn.com/docs/installation)
- **New project via CLI:** `pnpm dlx shadcn@latest init -t [framework]` — supported templates include `vite` (use for Vite + React libraries).
- **Existing project:** follow the **Vite** guide’s _Existing Project_ section for manual steps (`components.json`, Tailwind, aliases, `src` layout).

## Stack assumptions

- **Vite + React** component library or app shell (matches AutoDSM preview and T3 Code web conventions).
- shadcn/ui sits on **React**, **Tailwind CSS**, and **Radix-style primitives**; components are copied into your repo (not consumed only as opaque npm package internals).

## Installation checklist (target workspace)

1. **CLI init (greenfield):** From the project root, run the framework template init for Vite per the docs (e.g. `shadcn@latest init -t vite`). Prefer the package manager the workspace already uses (`bun`, `pnpm`, `npm`, `yarn`).
2. **Existing repo:** Ensure Tailwind v4 (or the version shadcn’s current docs require) is configured per the Vite guide; add `components.json`; set `tailwind.config`, CSS entry (`@import "tailwindcss"` or project-equivalent), and path aliases (e.g. `@/components`) to match the CLI output.
3. **Add components:** `npx shadcn@latest add <component>` (or `bunx` / `pnpm dlx` equivalent) so source files land under the configured components directory.
4. **Verify:**
   - `components.json` exists and paths match the repo’s `tsconfig` paths.
   - Global styles import Tailwind and any CSS variables shadcn expects.
   - No duplicate conflicting Tailwind pipelines (single Vite plugin / PostCSS path).

## Coexistence and conflicts

- Treat **one primary** component kit per AutoDSM workspace for predictable tokens and Storybook; mixing full **MUI/Chakra** themes with shadcn’s Tailwind primitives in the same design-system package is usually a product smell—fork or package-boundary if truly needed.
- **Tailwind** is a peer concern: shadcn expects it; do not strip Tailwind from a shadcn workspace.

## AutoDSM mapping

- **Starter id:** `shadcn-ui` (see `apps/web/src/lib/autoDsmStarterCatalog.ts`).
- **Artifacts to keep healthy:** `ComponentRegistry`, `BrandProfile` (CSS variables / tokens aligned with shadcn theming), Storybook stories for primitives.

## Future: Components tab header + agent tab

When this skill backs a **library-specific agent**:

- Pin install and “health” checks to **presence of `components.json`**, Tailwind entry, and successful `add` paths.
- Agent prompts should assume **file-copied components** and class-variance patterns, not only npm imports.
- Prefer linking agents to the same **Vite** doc path the user chose (CLI template vs existing project) to avoid double config.
- **WebContentsView preview:** generated components must stay fully interactive (hover, focus, typing). Avoid `readOnly` / `disabled` unless demonstrating that state intentionally.
