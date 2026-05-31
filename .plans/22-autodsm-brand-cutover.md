# AutoDSM Brand Cutover Plan

## Progress

**2026-05-27:** User-visible text rebrand complete (Phases 1–2, 4–6 of this plan). Product UI, server messages, release notifications, marketing, and user-facing docs now say AutoDSM. Internal identifiers (`@t3tools/*`, `T3CODE_*`, `t3code:` keys, `com.t3tools.t3code`, legacy user-data dirs) remain unchanged. Guardrail: `bun run brand:audit`.

## Goal

Make the built application present itself as AutoDSM everywhere a user, beta tester, release
artifact, or support flow sees the product. T3 Code should stop appearing as the product name in
the running app, desktop shell, release artifacts, marketing surfaces, user-facing docs, and
operator messages.

This is a brand/product cutover, not a blind namespace rewrite. Existing substrate internals can
keep temporary `t3code` or `@t3tools/*` identifiers where changing them would break imports,
persisted data, update channels, or local developer environments. Those names should be hidden
behind AutoDSM-facing labels and migrated deliberately.

## Current Findings

`rg "T3 Code|T3CODE|t3code|t3 code|T3|T3Tools|t3tools"` shows references across:

- Product UI: `apps/web/src/branding.ts`, `apps/web/index.html`, splash screen, settings copy,
  update dialogs, pairing/help text, source-control and diagnostics copy.
- Desktop identity: `apps/desktop/package.json`, `apps/desktop/src/app/DesktopEnvironment.ts`,
  Electron launcher, application menu, SSH/password/update messages, app id, Linux WM class,
  user-data directory names, and tests.
- Release/build pipeline: `scripts/build-desktop-artifact.ts`, release smoke tests, nightly
  release naming, Discord release notifications, GitHub release workflow, artifact names, and
  update metadata.
- Server/operator surfaces: CLI descriptions, startup banner, config flag help, observability
  docs, remote connection docs, and source-control provider docs.
- Package and import namespaces: `@t3tools/*`, `oxlint-plugin-t3code`, workspace package names,
  branch prefixes, local storage keys, temp prefixes, marker strings, and `.t3code` config paths.
- Legacy marketing/docs: `apps/marketing`, `COLAB.md`, `REMOTE.md`, `KEYBINDINGS.md`, roadmap and
  skill docs that still explain T3 Code as the inherited substrate.

## Brand Policy

- Use `AutoDSM` as the product name everywhere visible in normal product use.
- Use `AutoDSM Dev`, `AutoDSM Alpha`, and `AutoDSM Nightly` for channel/stage labels unless a
  platform requires parentheses.
- Use `autodsm` for executable names, local storage keys, release artifact slugs, desktop entry
  names, user-data directory names, and generated package names.
- Use `com.autodsm.app` or an agreed equivalent reverse-DNS app id before the first signed build.
- Treat `T3 Code` as historical/substrate vocabulary only in developer docs that explicitly discuss
  the inherited engine. Even there, prefer one short note over repeated mentions.
- Do not rename provider concepts to AutoDSM-specific names when they are genuinely generic engine
  concepts; rename only the user-facing label.

## Phase 1: Centralize Brand Constants

1. Create a shared branding contract for product-visible values:
   `baseName`, `stageLabel`, `displayName`, `slug`, `artifactPrefix`, `appId`, `protocolName`,
   `supportEmail`/URLs if available, and update repository owner/name.
2. Replace hard-coded UI defaults in `apps/web/src/branding.ts` with AutoDSM values.
3. Replace desktop hard-codes in `apps/desktop/src/app/DesktopEnvironment.ts`,
   `apps/desktop/scripts/electron-launcher.mjs`, and `apps/desktop/package.json`.
4. Add tests that assert the default web/desktop product name is AutoDSM and that injected branding
   still overrides it.

Acceptance:

- `APP_BASE_NAME` defaults to `AutoDSM`.
- macOS app name, menu name, about panel, splash labels, and document title show AutoDSM.
- Existing desktop branding injection still works.

## Phase 2: User-Facing Copy Sweep

1. Replace visible `T3 Code` copy in `apps/web/src/components`, `apps/web/src/routes`,
   `apps/web/index.html`, and desktop strings with `AutoDSM`.
2. Update server/operator messages that a user can see during normal launch:
   startup banner, CLI descriptions, pairing copy, version mismatch hints, update prompts,
   source-control settings, keybinding messages, diagnostics labels, and SSH prompts.
3. Keep provider names, model names, and generic source-control concepts unchanged.
4. Update tests that assert user-facing strings.

Acceptance:

- `rg -n "T3 Code|t3 code" apps/web apps/desktop apps/server/src scripts` returns only approved
  compatibility/internal comments or fixtures.
- Splash, settings, update, pairing, and error states all read as AutoDSM.

## Phase 3: Desktop Release Identity

1. Change release build defaults in `scripts/build-desktop-artifact.ts`:
   product name, artifact name, executable name, Linux desktop entry, WM class, build description,
   staged package name, and package metadata.
2. Change release notification and nightly release naming to AutoDSM.
3. Update GitHub release workflow expectations and release smoke tests.
4. Decide the signed-build app id before shipping. If changing from `com.t3tools.t3code` after
   users already have builds installed, add a migration note because desktop auto-update identity
   may not carry across app ids.

Acceptance:

- Local release smoke tests expect `AutoDSM-*` artifacts.
- Nightly/latest release names say AutoDSM.
- Update dialogs and update metadata no longer expose T3 Code.

## Phase 4: Persistence and Compatibility Migration

1. Introduce AutoDSM-prefixed keys for new installs:
   local storage (`autodsm:*`), user data (`autodsm` / `autodsm-dev`), temp prefixes,
   marker strings, generated config paths, and branch prefixes where product-visible.
2. Read old T3-prefixed values as legacy fallbacks for at least one alpha/beta cycle:
   `t3code:*` local storage, `T3 Code (Alpha)` user data, `.t3code` VCS config,
   `T3CODE_*` environment variables, and `t3code/` temporary branches.
3. For env vars, prefer a compatibility bridge instead of a flag day:
   read `AUTODSM_*` first, then `T3CODE_*`, and update help text to document the new names.
4. For config files, support both `.autodsm` and `.t3code` discovery, writing only `.autodsm`
   after migration.

Acceptance:

- Existing local dev setups still launch with old `T3CODE_*` values.
- Fresh installs write AutoDSM-prefixed state.
- Tests cover old-read/new-write behavior for key storage and config paths.

## Phase 5: Package Namespace Decision

1. Keep `@t3tools/*` imports temporarily unless package names must be public before ship.
2. If public/package-level rebrand is required, do it as a dedicated mechanical migration:
   package names, import specifiers, workspace filters, lockfile, tsconfig/vite/vitest aliases,
   release scripts, oxlint plugin name, and docs.
3. Prefer a package scope such as `@autodsm/*` only after confirming npm ownership and release
   targets.
4. Rename `oxlint-plugin-t3code` last; it is developer tooling and import-sensitive.

Acceptance:

- Either all public package names are AutoDSM, or the remaining `@t3tools/*` names are explicitly
  documented as private substrate internals.
- No mixed public package identity in release outputs.

## Phase 6: Marketing and Documentation Cutover

1. Replace `apps/marketing` T3 Code landing/download copy with AutoDSM product positioning.
2. Update user-facing docs: `REMOTE.md`, `KEYBINDINGS.md`, `docs/source-control-providers.md`,
   `docs/release.md`, and `docs/observability.md`.
3. Keep only a small historical/substrate note in developer docs where useful:
   `AGENTS.md`, `AUTODSM.md`, `.plans/21-autodsm-execution-roadmap.md`, and `skills/README.md`.
4. Remove or rewrite legacy tweet/testimonial fixtures that market T3 Code as the product.

Acceptance:

- Product docs and marketing pages say AutoDSM.
- Developer docs explain the inherited substrate once, then use AutoDSM vocabulary for build work.

## Phase 7: Guardrails

1. Add a lint or test guard that fails on unapproved product-visible `T3 Code` strings.
2. Maintain an allowlist for internal compatibility identifiers:
   `@t3tools/*`, `T3CODE_*` fallback reads, migration tests, and historical substrate docs.
3. Add a short `bun run brand:audit` script if the check does not fit existing lint rules.

Acceptance:

- A new user-facing `T3 Code` string cannot land accidentally.
- The allowlist is small and reviewed during each phase.

## Validation

Run after each implementation phase:

```sh
bun fmt
bun lint
bun typecheck
bun run test -- <focused tests changed by the phase>
```

Run before declaring the cutover complete:

```sh
bun fmt
bun lint
bun typecheck
bun run test
rg -n "T3 Code|t3 code|T3CODE|t3code|T3Tools|t3tools" apps packages scripts docs skills .plans
```

Final audit should classify every remaining match as one of:

- legacy fallback read,
- private package/import namespace pending Phase 5,
- historical substrate explanation,
- test fixture proving migration compatibility.

## Suggested Implementation Order

1. Brand constants and web/desktop visible labels.
2. UI copy sweep and focused tests.
3. Desktop artifact/release identity.
4. Persistence/env compatibility migration.
5. Marketing/docs.
6. Package namespace decision.
7. Guardrail audit.

This order gets the product to feel like AutoDSM quickly while leaving the risky build-system and
namespace work until the visible surface is already clean.
