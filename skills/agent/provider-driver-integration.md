# Provider Driver Integration

## Position

AutoDSM consumes T3 Code provider drivers. Do not create a separate provider system for v1.

## v1 Provider Policy

- Codex CLI is primary.
- Claude Code joins when T3 Code support is stable.
- AutoDSM does not proxy provider tokens.

## Run Contract

Provider runs must support component-scoped prompts, per-run cwd inside `~/.autodsm/systems/<id>/system/`, streaming events, cancellation, file-change capture, and error reporting.

## Failure Modes

No provider installed, provider unauthenticated, cwd unsupported, agent crash, invalid file output, Storybook render failure.
