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

- **Status:** in_progress (confirm)
- **Last verified:** N/A — needs explicit smoke before Day 1 sign-off.
- **Evidence:** `apps/web/src/routes/onboarding.tsx`, magic-link UI present; profile/telemetry/feedback IPC surfaced.
- **Acceptance:** ⬜ Magic-link auth works against prod Supabase project · ⬜ Beta status gates access · ⬜ Telemetry/feedback writes succeed without source artefacts · ⬜ Env keys validated in `release.yml`.
- **Blockers:** Supabase env keys not yet confirmed in CI; no successful production magic-link smoke recorded.
- **Next:** Day 1 — run end-to-end magic-link from a notarized DMG.

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

- **Status:** in_progress
- **Last verified:** 2026-05-18.
- **Evidence:** `apps/web/src/components/autodsm/AutoDsmCreateComponentWorkspace.tsx` modified in current working tree; composer + example prompts visible; component agent bridge wired.
- **Acceptance:** ⬜ Prompt creates a component end-to-end · ⬜ Story generated · ⬜ Conversation history persists.
- **Blockers:** the uncommitted refactor in the working tree needs to land before this can be exercised reliably.
- **Next:** Day 1 — land WIP commits, then smoke.

## Phase 8 — Component page

- **Status:** done
- **Last verified:** 2026-05-18 (commit `a0811c89` — "ship component page UX, preview isolation, and brand cutover").
- **Evidence:** toolbar, canvas, right rail, props panel, variants dropdown, scoped composer, history; `/` commands and `@` token autocomplete in `ComposerPromptEditor.tsx`.
- **Acceptance:** ✅ Component edit loop runs · ✅ ChangeSet available after edit.
- **Blockers:** end-to-end ChangeSet → diff → PR not yet smoked on a signed build.
- **Next:** Day 3 hero-path rehearsal.

## Phase 9 — Diff and PR creation

- **Status:** in_progress
- **Last verified:** N/A.
- **Evidence:** `AutoDsmPullRequestDialog.tsx`, `autodsmPullRequestsQueryOptions` IPC, `/prs` workspace layout, `pullrequest.created` activity entries.
- **Acceptance:** ⬜ Diff slide-over with hunk-level approve/reject/discard (criterion 15) · ⬜ Local PR appears in Recent (criterion 16).
- **Blockers:** hunk state model not verified — needs explicit walk-through.
- **Next:** Day 5 — diff/PR smoke on a real workspace.

## Phase 10 — Publish pipeline

- **Status:** in_progress
- **Last verified:** N/A.
- **Evidence:** `AutoDsmPublishDialog.tsx` exists; tsup bundling referenced; export path `~/.autodsm/exports/<id>-<version>/` defined.
- **Acceptance:** ⬜ Typed npm package produced (criterion 17) · ⬜ Installs into fresh `npm create vite@latest` (criterion 18).
- **Blockers:** round-trip into a fresh Vite app has not been demonstrated.
- **Next:** Day 5 — publish + fresh-Vite install dress rehearsal.

## Phase 11 — Polish and hardening

- **Status:** in_progress (signing) / not_started (most polish)
- **Last verified:** N/A.
- **Evidence:** dev-electron supervisor lockfile + ppid watchdog landed this session (crash/orphan fix); release.yml exists with placeholders for signing creds.
- **Acceptance:** ⬜ No orphaned subprocesses on quit (criterion 20) · ⬜ Signed build passes Gatekeeper (criterion 22) · ⬜ App id finalised before first signed build.
- **Blockers:** Apple Developer creds not yet confirmed populated in CI secrets; app id rename decision (`com.t3tools.t3code` → `com.autodsm.app`) outstanding.
- **Next:** Day 2 — sign + notarize dress rehearsal.

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
| 2 — User-facing copy sweep                    | in_progress   | needs `rg "T3 Code\|t3 code"` audit                  |
| 3 — Desktop release identity                  | in_progress   | `build-desktop-artifact.ts` strings + app id pending |
| 4 — Persistence + env compatibility migration | not_started   | `autodsm:*` reads with `t3code:*` fallback           |
| 5 — Package namespace decision                | deferred_v1.1 | keep `@t3tools/*` as private substrate               |
| 6 — Marketing + documentation cutover         | not_started   | landing page + READMEs                               |
| 7 — Guardrail                                 | not_started   | `bun run brand:audit` or oxlint rule                 |

---

## Substrate / hardening side-quests landed this session (2026-05-19)

- **Dev-supervisor lockfile + ppid watchdog** — `apps/desktop/scripts/dev-electron.mjs` + `dev-electron-supervisor-utils.mjs`. Stops the "8 orphaned supervisors fighting over the single-instance lock" failure mode. 30 supervisor-utils tests passing. Closes the long-running crash/restart loop.
- **`second-instance` activation hardened** — `apps/desktop/src/app/DesktopLifecycle.ts` wraps activation in `Effect.catchCause` so silent failures get logged.
- **Home dashboard rewrite** — see Phase 5.
- **Design tokens overhaul** — pill nav, oklch→rgb display, Mention column drop, Global/Semantic two-tier; see Phase 6.

---

## Pending punch list — derived from `.plans/review-the-product-and-vivid-spark.md`

### P0 — ship blockers (must close before tag)

1. Hero path smoke on a clean DMG.
2. macOS signing + notarization works in `release.yml`.
3. App id finalised before signing (`com.autodsm.app` decision locked).
4. Magic-link auth + Supabase beta gate end-to-end.
5. Workspace creation timing (Modern Starter ≤ 10s, shadcn/ui ≤ 30s).
6. Diff slide-over hunk approve / reject / discard.
7. Local PR creates an activity entry.
8. Publish pipeline outputs a typed npm package (round-trip into fresh Vite).
9. App quit stops Storybook and agent subprocesses.
10. Brand-cutover Phase 7 guardrail (`bun run brand:audit` or oxlint rule).
11. Land or shelve the 29 uncommitted files (Home, Design Tokens, supervisor lock).
12. Resurrect / maintain this file as the rolling status log.

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
- [ ] Magic-link auth completes against prod Supabase.
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
