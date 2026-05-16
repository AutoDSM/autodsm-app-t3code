# AutoDSM — Phase Acceptance Criteria

## Phase 3: Render

**Done means:**

- [ ] 80%+ of fixture components render on first open across the Top-20 adapters
- [ ] `RenderFailureCard` surfaces every failure with structured diagnosis, never a bare stack
- [ ] Watchdogs fire correctly at 5s / 8s; "Restart runtime" recovers without app reload
- [ ] Safe-runtime patches all targets:
  - [ ] `fetch`
  - [ ] `XHR`
  - [ ] `localStorage`
  - [ ] `sessionStorage`
  - [ ] `WebSocket`
  - [ ] `React.useEffect`
- [ ] Provider tree is driven by the **full** ui-library-registry, not a 3-ID branch
- [ ] All inbound iframe messages `zod.safeParse`'d

### Test Matrix

| Fixture | Library | Expected |
|---------|---------|----------|
| shadcn-starter | shadcn/ui | All components render |
| mui-dashboard | MUI | All components render |
| chakra-app | Chakra UI | All components render |
| tailwind-basic | Tailwind CSS | All components render |

---

## Phase 6: Agent

**Done means:**

- [ ] Each provider works end-to-end (prompt → ChangeSet → diff → approve → render):
  - [ ] Claude CLI
  - [ ] Codex CLI
  - [ ] Cursor CLI
  - [ ] Anthropic API (BYOT)
  - [ ] OpenAI API (BYOT)
- [ ] `AGENTS.md` is generated from `BrandProfile` and respected by all CLIs
- [ ] PATH gauntlet works on a fresh macOS with Homebrew default install
- [ ] DiffSlideOver opens via `AgentRunChip` click
- [ ] Per-hunk approve/reject in DiffSlideOver
- [ ] HMR re-renders the canvas within 500ms of approve

### Test Matrix

| Provider | Prompt | Expected |
|----------|--------|----------|
| claude-cli | "Make button rounded" | ChangeSet with border-radius change |
| codex-cli | "Add hover state" | ChangeSet with hover styles |
| cursor-cli | "Use primary-600 color" | ChangeSet with token reference |
| anthropic-api | "Add loading spinner" | ChangeSet with spinner component |
| openai-api | "Increase padding" | ChangeSet with spacing change |

---

## Phase 7: Ship

**Done means:**

- [ ] Full flow works for **each** credential setup:
  - [ ] SSH remote + `gh` installed and authed
  - [ ] HTTPS remote + osxkeychain helper
  - [ ] HTTPS remote, no helper, device-flow OAuth via Keychain
  - [ ] HTTPS remote + `AUTODSM_GITHUB_TOKEN` env override
- [ ] Branch protection requiring 2 approvals + signed commits → button states correct
- [ ] Merge button never enabled when merge would fail
- [ ] Pre-commit hook fails → `HookFailureSurface` with stderr; re-prompt path works
- [ ] App quit mid-session → reopening shows in-flight session; resume continues
- [ ] Merging a PR archives the session and deletes the local branch (and remote, per setting)
- [ ] No GitHub token logged anywhere
- [ ] Keychain holds at most one entry (`autodsm/github-token`)

### Test Matrix

| Scenario | Expected Merge Button State |
|----------|----------------------------|
| Checks pending | "Waiting for checks…" (disabled) |
| Checks failed | "Checks failed" (disabled) |
| Needs 2 approvals, has 0 | "Needs 2 approval(s)" (disabled) |
| Needs 2 approvals, has 1 | "Needs 1 approval(s)" (disabled) |
| Needs 2 approvals, has 2, behind base | "Update branch" (action) |
| All green | "Merge" (enabled) |
| Unsigned commits required | "Configure signing" (link) |
| No merge permission | "Merge in GitHub" (link) |

---

## Phase 8: Publish

**Done means:**

- [ ] Free user publishes a local snapshot bundle that opens in any browser as a static brand book
- [ ] Pro user publishes to `autodsm.dev/<handle>`
- [ ] Subdomain renders the snapshot in <2s on first visit
- [ ] Snapshot diff between two versions highlights every changed component and token

### Test Matrix

| User Tier | Action | Expected |
|-----------|--------|----------|
| Free | Publish local | Zip file + HTML viewer |
| Pro | Publish hosted | Live at autodsm.dev/handle |
| Pro | Diff two snapshots | Side-by-side comparison |
| Team | Custom domain | Live at custom.domain.com |

---

## Cross-Phase Criteria

### Security (All Phases)

- [ ] `contextIsolation: true` for all renderers
- [ ] `nodeIntegration: false` for all renderers
- [ ] `sandbox: true` for all renderers
- [ ] Preload exposes typed bridge only (`window.autodsm.*`)
- [ ] No raw `ipcRenderer` exposed
- [ ] Every IPC payload `zod.safeParse`'d at both sides
- [ ] Iframe preview has strict CSP
- [ ] Tokens never logged, never echoed, never in error reports
- [ ] Crash reports default off

### Performance (All Phases)

- [ ] Indexing never blocks main process
- [ ] HMR re-render < 500ms
- [ ] First render < 3s on component select
- [ ] Snapshot publish < 30s for 100-component library

### UX (All Phases)

- [ ] No bare stack traces shown to user
- [ ] All errors have structured diagnosis
- [ ] All long operations have progress indicators
- [ ] All destructive actions have confirmation
- [ ] Keyboard shortcuts for common actions

---

## Regression Gates

Before any release:

1. **Fixture suite passes** — All fixture repos render at target percentage
2. **Security audit clean** — No IPC violations, no token leaks
3. **Performance benchmarks met** — All targets within 10% of baseline
4. **Manual smoke test** — Full prompt → merge flow on clean macOS

---

## Metrics to Track

| Metric | Target | Source |
|--------|--------|--------|
| Render success rate | >80% | Fixture suite |
| First render time | <3s | Telemetry |
| HMR update time | <500ms | Telemetry |
| Agent run success rate | >90% | Telemetry |
| Merge flow completion | >95% | Telemetry |
| Crash rate | <1% | Sentry (opt-in) |
