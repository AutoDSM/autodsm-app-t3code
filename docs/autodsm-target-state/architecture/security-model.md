# Security Model

## Core Principle

AutoDSM earns trust by keeping source, tokens, scans, stories, conversations, and generated packages local unless the user explicitly exports, publishes, pushes, or syncs later.

## Protected Assets

Workspace source, token values, component code, stories, AI conversation history, local PR records, diffs, provider CLI auth, and production repositories outside `~/.autodsm/`.

## Electron Defaults

All renderers use `contextIsolation: true`, `sandbox: true`, and `nodeIntegration: false`. Preload exposes narrow typed APIs only, with Zod validation on both sides.

## Filesystem Boundary

Allowed write paths are `~/.autodsm/systems/<id>/`, `~/.autodsm/exports/`, settings, and logs. Production repositories are not written by AutoDSM in v1.

## AI Provider Boundary

AutoDSM uses T3 Code's local CLI invocation. It does not store provider API keys, proxy AI tokens, or send workspace source through AutoDSM-owned cloud APIs.

## Supabase Boundary

Allowed: auth identity, beta status, telemetry event names/coarse metadata, feedback, hashed publish identifiers, aggregate counts.

Disallowed: component source, token raw values, generated stories, package contents, full prompts/conversations unless explicitly opted into a future support flow.

## Preview Security

The preview runs in a separate `WebContentsView`, locked to local Storybook URLs and approved resources. External navigation and popups are denied. Preview must not expose privileged preload APIs.

## IPC Security

Every IPC namespace needs a contract schema, runtime validation, explicit error shape, invalid-payload tests, and no generic filesystem escape hatch.

## Review Checklist

- Does this write outside `~/.autodsm/`?
- Does it expose source/tokens to Supabase or third-party APIs?
- Does it bypass ChangeSet review?
- Does it add untyped IPC?
- Does preview navigate away from allowed local URLs?
