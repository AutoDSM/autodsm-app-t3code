# Security Model

## Non-Negotiables

- `contextIsolation: true`
- `sandbox: true`
- `nodeIntegration: false`
- typed preload APIs only
- Zod validation on every IPC boundary
- no production repo writes in v1
- no design-system source in Supabase

## File Boundary

Allowed writes: `~/.autodsm/systems/<id>/`, `~/.autodsm/exports/`, settings, logs. Everything else requires explicit future scope.

## Preview Boundary

Storybook renders inside a separate `WebContentsView` locked to local URLs. No privileged preload APIs, no arbitrary navigation, no popups by default.

## Agent Boundary

Provider auth stays with local CLI tools. Agent output becomes GenerationPlan/ChangeSet and is reviewed before commit/publish.
