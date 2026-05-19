# Chakra UI — AutoDSM design system skill

## When to use

Load when implementing or repairing a workspace that targets **Chakra UI** (AutoDSM starter id **`chakra-ui`**), generating install/setup steps for an agent, or wiring the future **Components** tab / per-library agent to a Chakra-based library.

## Canonical documentation

- Install and setup: [Chakra UI — Installation](https://chakra-ui.com/docs/get-started/installation)
- **Vite guide:** use the **Vite** framework doc from the same site when scaffold details differ by bundler.
- **Minimum Node:** Chakra documents **Node 20.x+**; match CI and local dev to that floor.

## Stack assumptions

- **React** app or component library with **Vite** (or another supported framework guide).
- Current Chakra uses **Emotion** at runtime; long-term styling direction in their docs may evolve—always cross-check the installed major version’s README when upgrading.

## Installation checklist (target workspace)

1. **Core packages**

   ```bash
   bun add @chakra-ui/react @emotion/react
   ```

   Adjust for the workspace package manager if needed.

2. **Snippets (optional but typical for new projects):** Use `@chakra-ui/cli` per docs, e.g. `npx @chakra-ui/cli snippet add`, to pull pre-built patterns into `components/ui` (or the path the CLI generates).

3. **Root provider:** Wrap the application (and Storybook preview) with the generated **`Provider`** (or equivalent `ChakraProvider` setup from the version you use). If docs prescribe **`next-themes`** for color mode, add it when the target is Next.js; for **Vite SPA**, follow the Vite guide’s color-mode pattern.

4. **TypeScript:** Ensure `tsconfig` includes **`module: "ESNext"`**, **`moduleResolution: "Bundler"`**, **`skipLibCheck: true`**, and path aliases such as `"@/*": ["./src/*"]` if snippets rely on `@/` imports.

5. **Verify:** Dev server builds; a minimal `Button` / `HStack` render works; Emotion instance is not duplicated across bundles.

## Coexistence and conflicts

- Chakra + **another full runtime theme** (e.g. MUI + Chakra in one package) creates CSS and provider ordering issues—keep **one primary system** per AutoDSM workspace unless packages are strictly separated.
- Align **React major** with Chakra’s peer requirements for the installed major version.

## AutoDSM mapping

- **Starter id:** `chakra-ui` (`autoDsmStarterCatalog`).
- **Artifacts:** `BrandProfile` ↔ Chakra theme tokens / semantic tokens; `ComponentRegistry` lists Chakra-based components and stories.

## Future: Components tab header + agent tab

- Health checks: **`@chakra-ui/react`** + **`@emotion/react`**, root `Provider`, `tsconfig` paths for `@/*` if used by snippets.
- Agent prompts should reference the **Vite** path when the workspace is Vite-based, and mention **snippets + primitives** flow from the official install doc.
- **WebContentsView preview:** keep interactive states (hover, focus, pressed) enabled; avoid `readOnly` / `disabled` unless demonstrating that state intentionally.
