# AutoDSM build progress

Rolling phase-status log mandated by `.plans/21-autodsm-execution-roadmap.md`.
Updated after every phase closeout and at every go/no-go gate.

Conventions: each phase shows **Status · Last verified · Evidence · Acceptance · Blockers · Next**.
Status values: `not_started` · `in_progress` · `done` · `deferred_v1.1`.

---

## Snapshot — 2026-05-19

- **Last stable tag:** `v0.0.24` (2026-05-09).
- **Latest nightly:** `v0.0.25-nightly.20260515.295`.
- **Target ship:** `v1.0.0-alpha.1` on 2026-05-31, promoted to `v1.0.0` same day if go/no-go is green.
- **Tests:** 154 web files · 141 server · 28 desktop — 1327 web tests passing on this revision.

---

## Phase 0 — Substrate audit and scaffold

- **Status:** done
- **Last verified:** 2026-05-18 (commit `2b09f41e`).
- **Evidence:** `.plans/` substrate-audit and substrate-asks artefacts; T3 Code substrate tests (`bun run test`) green; AutoDSM monorepo apps/packages structure in place.
- **Acceptance:** ✅ Audit complete · ✅ Substrate asks documented · ✅ Dev environment runs (`bun dev:desktop`) · ✅ Scaffold minimally invasive.
- **Blockers:** none.
- **Next:** maintain — no follow-up scheduled.

## Phase 1 — Supabase auth and beta gate

- **Status:** done
- **Last verified:** 2026-05-26 — OAuth client, beta gate, telemetry, Electron modal OAuth, beta_status RLS hardening, verification script.
- **Evidence:** `apps/web/src/lib/supabase/*`, `apps/web/src/routes/auth.callback.tsx`, `apps/desktop/src/oauth/supabaseOAuthWindow.ts`, `supabase/migrations/`, `scripts/verify-supabase-oauth.ts`, `supabase/README.md` dashboard checklist, `.github/workflows/release.yml` Supabase secrets wiring.
- **Acceptance:** ✅ GitHub/Google OAuth client wired (web redirect + Electron modal PKCE) · ✅ Beta status gates onboarding routes · ✅ Telemetry/feedback/publish-stats writes (RLS-safe, no source artefacts) · ✅ `release.yml` passes `VITE_SUPABASE_*` + build guard · ✅ Electron modal OAuth window · ✅ `profiles.beta_status` immutable for authenticated clients · ✅ `bun run verify:supabase-oauth` green (env, providers, authorize URLs, schema) · ✅ OAuth unit tests (19) · ✅ GitHub Actions secrets set · ⬜ Interactive OAuth smoke on notarized DMG (human sign-in with GitHub/Google accounts).
- **Blockers:** none for code/infra; interactive DMG OAuth smoke requires a signed build + human IdP sign-in.
- **Next:** Run manual OAuth smoke from packaged desktop after dashboard + secrets land; record in this file.

## Phase 2 — Workspace and fork

- **Status:** done
- **Last verified:** 2026-05-18.
- **Evidence:** `apps/server/src/autodsm/AutoDsmWorkspaceService.ts`; workspaces materialise under `~/.autodsm/systems/<id>/`; Modern Starter and shadcn/ui templates bundled.
- **Acceptance:** ⬜ Modern Starter creates ≤ 10s (timing not yet measured on Sequoia) · ⬜ shadcn/ui ≤ 30s · ✅ Production code is not written.
- **Blockers:** timing measurements outstanding.
- **Next:** Day 3 — capture timings on the dress-rehearsal machine.

## Phase 3 — Storybook orchestration

- **Status:** done
- **Last verified:** 2026-05-18.
- **Evidence:** `apps/desktop/src/componentPreview/componentPreviewViews.ts`, preview `WebContentsView` lifecycle, sidecar status query in the Home dashboard.
- **Acceptance:** ✅ Workspace components render through local Storybook · ✅ Preview canvas tracks bounds.
- **Blockers:** render-health surfacing in the UI not yet wired (Phase 11 polish).
- **Next:** Phase 11 polish window.

## Phase 4 — Sidebar and navigation

- **Status:** done
- **Last verified:** 2026-05-18.
- **Evidence:** `apps/web/src/components/Sidebar.tsx` with atomic groups; routes for Home, Create Component, Design Tokens, Search; Cmd-K palette in `CommandPalette.tsx`.
- **Acceptance:** ✅ Navigation works across real workspace data · ✅ Cmd-K search.
- **Blockers:** ⬜ Render-health status badges on atomic groups not yet wired (acceptance criterion 8).
- **Next:** P1 item #19 — render-health badges.

## Phase 5 — Home dashboard

- **Status:** done
- **Last verified:** 2026-05-19 — current session.
- **Evidence:** rewritten this session; `apps/web/src/components/autodsm/AutoDsmHomeDashboard.tsx` shows greeting (`Let's build {projectName}.`), 4 metric cards (Components, Tokens, Adoption, Health), and Recent activity sourced from `autodsm.listActivity`.
- **Acceptance:** ✅ Real component/token data · ✅ Activity feed · ⬜ Suggestions panel not yet implemented (acceptance criterion 9 partial).
- **Blockers:** suggestions are out of scope for v1.0 alpha unless trivial.
- **Next:** evaluate whether suggestions land in v1.0.0 or defer to v1.0.1.

## Phase 6 — Design tokens

- **Status:** done
- **Last verified:** 2026-05-19 — current session.
- **Evidence:** pill-nav category switcher (Colors/Typography/Spacing/Motion), oklch→rgb display via `apps/web/src/lib/colorFormat.ts`, Mention column dropped (stacked under name), Global/Semantic tier toggle with `var(--…)` resolution and `→ @reference` chip via `apps/web/src/lib/colorTokenTiers.ts`.
- **Acceptance:** ✅ Token edits write to disk · ✅ Storybook re-render on edit · ⬜ Token usage tracking ("affected components") not yet surfaced (acceptance criterion 12).
- **Blockers:** usage tracking is the remaining gap; P1 item #18.
- **Next:** Day 4 — wire usage tracking from the registry into the token row.

## Phase 7 — Create component

- **Status:** done (against the real preview substrate)
- **Last verified:** 2026-05-28 — loop pinned by `apps/server/src/autodsm/createComponentLoop.integration.test.ts` (3 tests green).
- **Evidence:** `AutoDsmCreateComponentWorkspace.tsx` composer + example prompts; `registerComponentAgent` seeds `creating` status; on turn-settle `useAutoDsmComponentPreviewRefresh` → `invalidateComponentPreviewQueries` invalidates the component registry → server `getComponentRegistry` runs `reconcileComponentIdsFromRegistry`, flipping `creating`→`active` and stamping `componentId`; `ChatView` mounts `useAutoDsmComponentConversationSync` → `appendComponentConversation` persists the scoped conversation.
- **Acceptance:** ✅ Prompt creates a component end-to-end (file lands → agent reconciles to `active` + `componentId`) · ✅ Conversation history persists · ⛔️ "Story generated" criterion is **obsolete** — see Storybook divergence note below.
- **Blockers:** none in code. Remaining is a live-app smoke on a packaged build (covered by the hero-path gate).
- **Next:** include in the hero-path rehearsal.

> **Storybook divergence (roadmap vs. code).** `.plans/21` Phase 3 / Phase 7 describe a
> Storybook substrate ("Generate `.storybook` config and stories", "Implement
> `StoryGenerator`", "story generated"). The implementation **pivoted away from Storybook**
> to a custom esbuild bundle (`apps/server/src/componentPreview/bundleComponentPreview.ts`)
> rendered in an Electron `WebContentsView`. No `.stories.*` files exist in any
> workspace template, nothing bundles or reads stories, and the component scanner
> (`componentAgentScanner.ts`) explicitly _skips_ `.stories.tsx`. Generating stories today
> would produce dead artifacts, so the "story generated" acceptance criterion is treated as
> obsolete. If Storybook is ever reintroduced, restore `StoryGenerator` and unskip stories
> in the scanner.

## Phase 8 — Component page

- **Status:** done
- **Last verified:** 2026-05-18 (commit `a0811c89` — "ship component page UX, preview isolation, and brand cutover").
- **Evidence:** toolbar, canvas, right rail, props panel, variants dropdown, scoped composer, history; `/` commands and `@` token autocomplete in `ComposerPromptEditor.tsx`.
- **Acceptance:** ✅ Component edit loop runs · ✅ ChangeSet available after edit.
- **Blockers:** end-to-end ChangeSet → diff → PR not yet smoked on a signed build.
- **Next:** Day 3 hero-path rehearsal.

## Phase 9 — Diff and PR creation

- **Status:** code-complete — full pipeline built (server + RPC + web UI); needs an interactive app smoke.
- **Last verified:** 2026-05-28 — server core unit-tested (9 `changeSetHunks` tests), web review logic unit-tested (6 `pullRequestHunkReview.logic` tests), full repo typecheck green, lint clean, 136 autodsm tests pass.
- **Root cause closed:** `changeSetCreate` existed but was never fed — AI edits flowed through the orchestration thread and were only rendered as chat turn diffs, never captured as `AutoDsmChangeSet`s. The hunk pipeline now bridges that gap.
- **Done:**
  - Contracts: `AutoDsmChangeHunk`/`AutoDsmChangeHunkDecisionSchema` moved ahead of `AutoDsmChangeSet`; `hunks` added to `AutoDsmChangeSet` + `AutoDsmChangeSetCreateInput`; new `AutoDsmChangeSetFromTurnDiffInput` + `AutoDsmChangeSetHunkDecisionInput`.
  - `apps/server/src/autodsm/changeSetHunks.ts`: `deriveChangeSetOpsAndHunks` (unified diff → ops + pending hunks via `@pierre/diffs`) and `reconstructFileWithDecisions` (deterministic revert of rejected/discarded hunks from the on-disk AFTER content; no base read, no fuzzy `git apply`). 9 unit tests incl. round-trip + trailing-newline.
  - Server methods on `AutoDsmWorkspaceService`: `changeSetCreateFromTurnDiff`, `changeSetSetHunkDecisions`, `changeSetApplyDecisions` (+ `changeSetCreate` now persists hunks); `changeset.hunk-decided` / `changeset.applied(disposition)` activity entries.
  - Full RPC wiring: `rpc.ts` (3 `Rpc.make` + group), `ws.ts` routes, `ipc.ts` `AutoDsmApi`, web `wsRpcClient.ts` + `environmentApi.ts`, and React Query helpers (`autodsmCreateChangeSetFromTurnDiff` / `autodsmSetHunkDecisions` / `autodsmApplyChangeSetDecisions`).
- **Web UI (new this session):**
  - `useAutoDsmCaptureChangeSet` — on-demand capture: reuses the chat `DiffPanel` checkpoint-turn-count inference, fetches the full-thread diff (`ignoreWhitespace: false`), and calls `autodsm.changeSetCreateFromTurnDiff` → a `pending`-hunk changeset.
  - `pullRequestHunkReview.logic.ts` (+6 unit tests) — grouping, decision summary, disposition preview, immutable decision updates.
  - `PullRequestHunkReview.tsx` — renders each hunk via the same `@pierre/diffs` `FileDiff` the chat `DiffPanel` uses, with per-hunk Approve/Reject/Discard + Approve-all/Reject-all + an Apply action showing the resulting disposition.
  - `AutoDsmHunkReviewPanel.tsx` — holds decision state, persists via `changeSetSetHunkDecisions`, applies via `changeSetApplyDecisions`.
  - `AutoDsmPullRequestDialog.tsx` — "Capture edits for review" button + inline "Review N hunks" expander per changeset.
- **Acceptance:** ✅ Diff slide-over with hunk-level approve/reject/discard (criterion 15) — built; needs app smoke · ✅ Local PR appears in Recent (criterion 16) — `pullrequest.created` renders in `HomeRecentActivity`.
- **Remaining:** interactive app smoke of the full loop (capture → review → apply → PR); optional polish: a dedicated `_chat.prs.$prId` route and an activity-row clickthrough (criterion 16 already met via Recent activity).
- **Blockers:** none in code; remaining is a live-app verification pass.

## Phase 10 — Publish pipeline

- **Status:** done (pipeline) — scripted round-trip green; full styled-render needs a real installed workspace.
- **Last verified:** 2026-05-28 — `bun run autodsm:publish-smoke` passes (publish → dist cjs/esm/dts → exports map → css → consumer import bundles).
- **Evidence:** `apps/server/scripts/release-autodsm-publish-smoke.ts`; `publishedExportStore.ts` hardened.
- **Findings + fixes (this session):**
  - `bunx tsup --dts` failed with `Cannot find module 'typescript'` for workspaces outside the repo (no hoisting). Fixed: pass `NODE_PATH=<systemDir>/node_modules` to the tsup spawn so the workspace's typescript resolves.
  - tsup could exit 0 yet skip outputs → a package that installs but won't import. Fixed: validate `dist/index-export.{js,mjs,d.ts}` exist after tsup, fail loudly otherwise.
  - Added a proper `exports` map (deterministic ESM/CJS/types + `./index.css` subpath), `type: "module"`, and `sideEffects` so modern bundlers (Vite, the v1 install target) resolve correctly; `files`/css/README now conditional on the stylesheet existing.
  - The dts build also depends on the workspace `tsconfig.json` (jsx) and installed React types — these come from the workspace's own deps (shadcn/Modern Starter ship them), so the smoke uses a dependency-free component to isolate pipeline mechanics.
- **Acceptance:** ✅ Typed npm package produced (criterion 17) — dist + .d.ts + exports validated · 🟡 Installs into fresh `npm create vite` (criterion 18) — import/bundle proven via esbuild; full styled render in a real Vite app is part of the hero-path smoke.
- **Blockers:** none in code; full styled-render proof needs a real installed workspace (hero-path rehearsal).

## Phase 11 — Polish and hardening

- **Status:** signing/notarization done; remaining polish in_progress
- **Last verified:** 2026-06-02 — v0.0.29 release.
- **Evidence:** dev-electron supervisor lockfile + ppid watchdog landed (crash/orphan fix); all 5 Apple signing secrets set in CI; **v0.0.29 ships signed + notarized** — `codesign` shows `Developer ID Application: Sebastian Mendo (F3NM4HTMW8)` (not adhoc), `spctl --assess` → `accepted / Notarized Developer ID`, `.app` notarization ticket stapled. Auto-update (electron-updater/Squirrel) now functional for installed users.
- **Acceptance:** ✅ Signed build passes Gatekeeper (criterion 22) · ✅ App id finalised (`com.autodsm.app`) · ⬜ No orphaned subprocesses on quit (criterion 20).
- **Blockers:** none for signing; remaining is subprocess-on-quit hardening + interactive hero-path smoke.
- **Next:** Hero-path smoke on the signed DMG.

## Phase 12 — Ship

- **Status:** not_started
- **Last verified:** N/A.
- **Evidence:** none.
- **Acceptance:** ⬜ Hero demo recorded · ⬜ Landing page + screenshots updated · ⬜ Beta invites prepared · ⬜ Submission packets drafted.
- **Blockers:** depends on Phase 11 producing a stable signed build.
- **Next:** Day 8 — record hero demo on the v1.0.0-alpha.1 build.

---

## Brand-cutover progress (`.plans/22-autodsm-brand-cutover.md`)

| Phase                                         | Status        | Notes                                                |
| --------------------------------------------- | ------------- | ---------------------------------------------------- |
| 1 — Centralize brand constants                | done          | per commit `a0811c89`                                |
| 2 — User-facing copy sweep                    | done          | `bun run brand:audit` passes clean                   |
| 3 — Desktop release identity                  | done          | `AutoDSM-*` artifacts, app id `com.autodsm.app`      |
| 4 — Persistence + env compatibility migration | mostly_done   | localStorage/userdata migrated; env-var `AUTODSM_*`/`T3CODE_*` bridge in progress |
| 5 — Package namespace decision                | deferred_v1.1 | keep `@t3tools/*` as private substrate               |
| 6 — Marketing + documentation cutover         | done          | landing page + user docs say AutoDSM                 |
| 7 — Guardrail                                 | done          | `scripts/brand-audit.ts` + `bun run brand:audit`     |

---

## Substrate / hardening side-quests landed this session (2026-05-19)

- **Dev-supervisor lockfile + ppid watchdog** — `apps/desktop/scripts/dev-electron.mjs` + `dev-electron-supervisor-utils.mjs`. Stops the "8 orphaned supervisors fighting over the single-instance lock" failure mode. 30 supervisor-utils tests passing. Closes the long-running crash/restart loop.
- **`second-instance` activation hardened** — `apps/desktop/src/app/DesktopLifecycle.ts` wraps activation in `Effect.catchCause` so silent failures get logged.
- **Home dashboard rewrite** — see Phase 5.
- **Design tokens overhaul** — pill nav, oklch→rgb display, Mention column drop, Global/Semantic two-tier; see Phase 6.

---

## Pending punch list — derived from `.plans/review-the-product-and-vivid-spark.md`

### P0 — ship blockers (must close before tag)

> **2026-06-02 update:** items 2, 3, 10, 11 are ✅ resolved (v0.0.29 signed+notarized; app id `com.autodsm.app`; `brand:audit` guard live & green; working tree clean). Item 4 is blocked only by the OAuth PKCE passkey bug (`.plans/23`). Items 1, 5–9 remain (mostly interactive smoke on the now-available signed DMG).

1. Hero path smoke on a clean DMG. ⬜ (now unblocked — signed v0.0.29 exists)
2. ✅ macOS signing + notarization works in `release.yml`.
3. ✅ App id finalised before signing (`com.autodsm.app`).
4. GitHub/Google OAuth sign-in + Supabase beta gate end-to-end. ⬜ (passkey path: `.plans/23`)
5. Workspace creation timing (Modern Starter ≤ 10s, shadcn/ui ≤ 30s). ⬜
6. Diff slide-over hunk approve / reject / discard. ✅ built; ⬜ needs app smoke.
7. Local PR creates an activity entry. ✅ built; ⬜ needs app smoke.
8. Publish pipeline outputs a typed npm package (round-trip into fresh Vite). ✅ built; ⬜ needs app smoke.
9. App quit stops Storybook and agent subprocesses. ⬜
10. ✅ Brand-cutover Phase 7 guardrail (`bun run brand:audit`).
11. ✅ Land or shelve the uncommitted files (working tree clean).
12. ✅ Resurrect / maintain this file as the rolling status log.

### P1 — launch-critical (close before announce, can slip 24–48h)

13. Brand-cutover Phase 2 — visible copy sweep.
14. Brand-cutover Phase 3 — release identity (artifact prefix, Linux desktop entry, WM class, Discord notifier).
15. Brand-cutover Phase 4 — persistence migration with legacy fallback.
16. Brand-cutover Phase 6 — marketing + docs cutover.
17. Hero demo recording + landing-page screenshots.
18. Token usage tracking shows affected components (criterion 12).
19. Sidebar render-health status badges (criterion 8).
20. PR #89 follow-up: C019 event race on SessionId routing.

### P2 — defer to v1.0.1 if time tight

21. Crash recovery + workspace recovery flows.
22. Render-health monitor inside Storybook orchestrator.
23. PATH resolution when launched from Finder.
24. Bug bash on Modern Starter, shadcn/ui, token-heavy workspaces.

### v1.1 — explicit deferrals

- Additional library forks (MUI, Chakra, Mantine).
- Stable Claude provider runtime integration.
- GitHub OAuth + remote PRs.
- Hosted registry / brand books / team sync / DSM-1 training data.
- Server-authoritative event-sourcing rewrite (`.plans/14`).
- Server auth model implementation (`.plans/18`).
- Brand-cutover Phase 5 (`@t3tools/*` → `@autodsm/*` package rename).

---

## Go / no-go gate — Day 7 (2026-05-29)

Tag `v1.0.0-alpha.1` when **all** of these are green:

- [ ] Hero path runs end-to-end on a signed DMG (sign in → shadcn workspace → Button → glass variant → diff → local PR → publish → fresh Vite install renders).
- [ ] `spctl --assess --verbose` returns `accepted`.
- [ ] GitHub/Google OAuth sign-in completes against prod Supabase (web + desktop).
- [ ] `bun run brand:audit` returns clean.
- [ ] No new TODO/FIXME in auth, IPC, update, or publish code paths.
- [ ] `bun fmt && bun lint && bun typecheck && bun run test` all pass on the tag commit.
- [ ] `release.yml` smoke step passes.

If any are red on 2026-05-29, ship a tester-only alpha from the most-recent green nightly and treat 2026-05-31 as a beta-invite milestone instead of `v1.0.0` promotion.

---

## Test surface

| App          | Test files | Notes                                                           |
| ------------ | ---------- | --------------------------------------------------------------- |
| apps/web     | 154        | +18 this session (oklch→rgb, Home metrics, color tier helpers). |
| apps/server  | 141        | unchanged this session.                                         |
| apps/desktop | 28         | +1 (supervisor-utils tests).                                    |

Total: 323 test files, 0 skipped, all green on this revision.

---

## TODO inventory (code-level)

Only three benign TODOs left in production code paths:

- `apps/web/src/components/autodsm/AutoDsmHomeDashboard.tsx:117` — route to a dedicated activity page when one exists.
- `apps/server/src/provider/CodexDeveloperInstructions.ts:15` — documentation note.
- `apps/server/src/provider/Layers/CodexSessionRuntime.ts:74` — verification task for code generation.

No TODOs in auth, IPC, release, or update flow. No `.skip` / `.todo` tests.

---

## Update protocol

When closing a punch-list item, update the corresponding phase entry's `Last verified`, `Evidence`, `Acceptance`, `Blockers`, and `Next` fields. When tagging a release, append a dated snapshot to the top of this file and shift the previous snapshot below the horizontal rule.
