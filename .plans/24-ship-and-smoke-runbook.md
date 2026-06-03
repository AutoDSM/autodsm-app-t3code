# Ship & Smoke Runbook (v0.0.29+)

Status handoff for the two remaining roadmap items that need a human: the **hero-path
smoke** (P0 #1 — interactive sign-in can't be automated here) and the **Phase 12 ship
tasks** (demo/marketing assets + decisions). Everything else from the "resolve pending
issues" pass is done and on `main`.

## A. Hero-path smoke — run on the signed DMG (P0 #1, #4–#9)

Install **AutoDSM-0.0.29-arm64.dmg** from the GitHub Release (already verified
Developer-ID signed + notarized + stapled). Then walk the full loop and record results:

1. **Sign in** — GitHub, Google (password account), Google (passkey account).
   - Expect: completes **in the auth shell**; no external browser opens; no
     `/auth/callback` error; lands on `/onboarding/create`. (Validates the OAuth PKCE
     fix, `.plans/23`.)
2. **Create workspace** — Modern Starter and shadcn/ui.
   - Capture timings: Modern Starter ≤ 10s, shadcn/ui ≤ 30s (P0 #5).
3. **Component** — add a Button, then a glass variant. Confirm preview renders.
4. **Render-health badges** — in the component sidebar, a group containing a component
   with preview diagnostics shows an amber count badge (hover for the diagnostic). Healthy
   groups show none. (Validates P1 #19.)
5. **Token usage** — open Design Tokens → Colors. Color tokens referenced by components
   (e.g. `primary`, `border`) show "Used in N components". (Validates P1 #18.)
6. **Diff** — make an edit; in the diff slide-over approve/reject/discard hunks (P0 #6).
7. **PR** — create a local PR; confirm it appears in Recent activity (P0 #7).
8. **Publish** — run the publish pipeline; install the typed package into a fresh
   `npm create vite` app and confirm it imports + renders styled (P0 #8).
9. **Quit** — confirm no orphaned Storybook/agent subprocesses remain (P0 #9):
   `ps aux | grep -iE "storybook|esbuild|autodsm" | grep -v grep` → empty.
10. **Auto-update** — install v0.0.28-or-earlier *signed* build if available, then confirm
    it auto-updates to the latest (electron-updater polls every ~4 min). Note: users on the
    pre-signing ad-hoc v0.0.27 must download v0.0.29 manually once (one-way cutover).

File any failure as its own issue.

## B. Phase 12 ship tasks (needs product/marketing)

- [ ] Record the hero demo on the signed build.
- [ ] Refresh landing-page screenshots + copy (the marketing app already deep-links the
      latest GitHub Release asset).
- [ ] Prepare beta invites.
- [ ] Draft submission packets.

These need assets and decisions only the owner can make — Claude can draft copy or wire
screenshots into `apps/marketing` on request, but can't complete them autonomously.

## C. Known remaining (non-blocking)

- Brand-cutover Phase 4 tail: branch/temp `t3code/` prefixes still legacy (env-var +
  storage bridges done). Phase 5 (`@t3tools/*` → `@autodsm/*`) intentionally deferred to v1.1.
- Token-usage UI currently renders on the Colors tab; extend the same `usageCountByTokenId`
  prop + `TokenUsageHint` to the other token sections when desired (mechanical).
- PR #89 follow-up: C019 event race on SessionId routing (P1 #20).
