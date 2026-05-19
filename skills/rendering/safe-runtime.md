# Safe Runtime

## v1 Goal

Keep Storybook preview deterministic, debuggable, and isolated.

## Rules

- Storybook runs locally under the AutoDSM workspace.
- Preview is loaded in a separate `WebContentsView`.
- Errors surface as render health.
- HMR updates component previews after token or source edits.
- Preview has no privileged APIs.
