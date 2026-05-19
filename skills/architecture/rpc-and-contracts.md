# RPC and Contracts — Adding a Cross-Process Payload

## Rule

All renderer-to-main and main-to-renderer payloads must be typed and Zod-validated.

## v1 Namespaces

- `auth`
- `workspace`
- `components`
- `tokens`
- `agent`
- `diff`
- `pr`
- `publish`
- `metrics`
- `telemetry`

## Recipe

1. Add schema in contracts.
2. Add main/service implementation.
3. Add preload-safe renderer API.
4. Add renderer hook/store.
5. Add invalid-payload and happy-path tests.

## Payload Discipline

AutoDSM payloads should reference artifacts by id/path within `~/.autodsm/systems/<id>/`; they should not expose generic arbitrary filesystem operations.
