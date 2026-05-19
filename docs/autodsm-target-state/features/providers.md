# AI Provider Integration

## Position

AutoDSM consumes T3 Code's provider/runtime primitives. It does not build a separate model provider system in v1.

## v1 Provider Order

1. Codex CLI through T3 Code.
2. Claude Code CLI when T3 Code support is stable.
3. Other provider modes are future hooks.

## Auth Passthrough

AutoDSM does not proxy or store model credentials. Provider auth remains in the user's local CLI environment and standard auth files.

## Component Context Payload

A component run receives workspace metadata, component source/metadata, component conversation history, active `BrandProfile`, token references selected through `@`, slash references selected through `/`, library conventions, and target write paths under `system/components/` and `storybook/stories/`.

A component run does not receive the whole workspace source by default.

## Create Component Prompt Contract

The create flow instructs the agent to create a focused React component, follow active starter/fork conventions, use active tokens, write to `system/components/<Name>.tsx`, create/update a Storybook story, and keep the component composable according to atomic design.

## Error Surfaces

Provider not installed, provider not authenticated, per-run cwd unsupported by T3 Code, agent failed, generated component failed to index, Storybook failed to render.
