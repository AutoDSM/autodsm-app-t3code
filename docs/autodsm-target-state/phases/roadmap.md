# AutoDSM — Implementation Roadmap

## Phase Overview

| Phase | Focus | Tier Unlocks | Status |
|-------|-------|--------------|--------|
| **0–1** | Shell | — | ✅ Done |
| **2** | Index | Free | ✅ Done |
| **3** | Render | Free | 🟡 In Progress |
| **4** | Visual | Free | ⏳ Next |
| **5** | Scan | Free (read) / Pro (fix) | ⏳ Planned |
| **6** | Agent | Pro | ⏳ Planned |
| **7** | Ship | Pro | ⏳ Planned |
| **8** | Publish | Pro / Team | ⏳ Planned |
| **9** | Harden | — | ⏳ Planned |
| **10+** | Web Surface | Team / Enterprise | ⏳ Future |
| **11+** | Moat | Team / Enterprise | ⏳ Future |

---

## Phase 0–1: Shell

**Focus:** Architecture hardening, secure Electron shell, fixture repos

### Definition of Done
- [x] One fixture project opens
- [x] ProjectProfile generated
- [x] IPC validated
- [x] Security defaults enforced (contextIsolation, sandbox, etc.)

### Deliverables
- Electron main process scaffold
- Secure preload bridge
- IPC channel definitions
- Fixture repo for testing

---

## Phase 2: Index

**Focus:** Extraction + ComponentRegistry

### Definition of Done
- [x] BrandProfile stable on real repos
- [x] ComponentRegistry stable on real repos
- [x] Worker-backed scanning (non-blocking)
- [x] Watch mode with debounce

### Deliverables
- Token extraction (Tailwind, CSS vars, theme objects)
- AST-based component discovery
- Provider chain inference
- Versioned artifact schemas

---

## Phase 3: Render (Current)

**Focus:** Sidecar runtime + RenderManifest

### Definition of Done
- [ ] 80%+ fixture components render on first open
- [ ] `RenderFailureCard` for every failure (structured diagnosis)
- [ ] Watchdogs fire at 5s/8s; "Restart runtime" recovers
- [ ] Safe-runtime patches all targets
- [ ] Provider tree driven by full ui-library-registry
- [ ] All iframe messages `zod.safeParse`'d

### Deliverables
- Sidecar Vite server (port 5180–5189)
- Iframe-bootstrap host page
- Virtual module plugins
- Safe-runtime patches:
  - `fetch`
  - `XHR`
  - `localStorage`
  - `sessionStorage`
  - `WebSocket`
  - `React.useEffect`
- Auto-mock providers
- Prop controls UI
- Theme/viewport pickers
- Screenshot capture

---

## Phase 4: Visual

**Focus:** Framework-native adapters + screenshots

### Definition of Done
- [ ] Top-20 adapters covered
- [ ] Screenshot grid working (theme × viewport matrix)
- [ ] Adapter SDK documented and stable

### Deliverables
- 20 Preview Adapters
- Adapter manifest schema
- Theme bridge per library
- Fixture sets for CI validation

---

## Phase 5: Scan

**Focus:** Off-brand scanner + Issues panel

### Definition of Done
- [ ] Generated components scanned before "success"
- [ ] Token drift detected
- [ ] Provider drift detected
- [ ] axe-core accessibility scan

### Deliverables
- Scanner worker
- Token-drift detection
- Provider-drift detection
- Prop-misuse detection
- axe-core integration
- ScanArtifact schema
- Issues panel UI
- Auto-fix from scan (Pro)
- Pre-merge gate (Team)

---

## Phase 6: Agent

**Focus:** GenerationPlan + ChangeSet review

### Definition of Done
- [ ] Claude CLI, Codex CLI, Cursor CLI, BYOT APIs all work
- [ ] `AGENTS.md` generated from BrandProfile
- [ ] PATH gauntlet works on fresh macOS + Homebrew
- [ ] DiffSlideOver with per-hunk approve/reject
- [ ] HMR re-render within 500ms of approve

### Deliverables
- AgentSupervisor service
- Provider resolver (4-tier hierarchy)
- Context payload assembler
- GenerationPlan schema
- ChangeSet schema
- ValidationReport (type-check, lint, scan)
- ComponentPromptBox
- AgentRunChip
- DiffSlideOver
- AGENTS.md generator

---

## Phase 7: Ship

**Focus:** GitHub OAuth + PR flow

### Definition of Done
- [ ] Full flow works for each credential setup:
  - SSH remote + `gh`
  - HTTPS + osxkeychain
  - HTTPS + device-flow OAuth
  - HTTPS + `AUTODSM_GITHUB_TOKEN`
- [ ] Branch protection states correct
- [ ] Hook failure → HookFailureSurface
- [ ] App quit mid-session → resume works
- [ ] Merge → archive + delete branch
- [ ] No token logged anywhere

### Deliverables
- GitEngine service
- CredentialResolver (4-source)
- Branch-per-session management
- Conventional commit generator
- PR body generator
- Merge button state machine
- HookFailureSurface
- Session persistence + resume

---

## Phase 8: Publish

**Focus:** Snapshot schema + hosting

### Definition of Done
- [ ] Free user publishes local snapshot bundle
- [ ] Pro user publishes to `autodsm.dev/<handle>`
- [ ] Snapshot diff between two versions

### Deliverables
- PublishedSnapshot schema
- Local snapshot export (zip/viewer)
- R2 storage integration
- Supabase integration
- autodsm.dev hosting
- Custom domain support (Team)
- Snapshot diff viewer

---

## Phase 9: Harden

**Focus:** Signing, notarization, auto-update

### Definition of Done
- [ ] Signed macOS build
- [ ] Repeatable install/update

### Deliverables
- Apple Developer ID signing
- Notarization workflow
- Sparkle/Squirrel auto-updater
- Local crash reports (opt-in Sentry)
- IPC security audit documentation

---

## Phase 10+: Web Surface

**Focus:** Hosted brand books, team workspaces

### Definition of Done
- [ ] Web is a surface, not the product

### Deliverables
- Hosted brand book viewer
- Team workspace dashboard
- Snapshot history
- Governance dashboards
- Cross-machine sync
- Role-based permissions

---

## Phase 11+: Moat

**Focus:** DSM-1, MCP server, Figma sync

### Definition of Done
- [ ] Data flywheel from CLI + desktop trains proprietary model

### Deliverables
- DSM-1 fine-tuned model
- MCP server (ComponentRegistry, BrandProfile, scan resources)
- Figma token sync
- Figma component mapping
- AGENTS.md export for external CLIs

---

## Decision Rubric

For any proposed feature, score on these axes:

1. **Wedge alignment** — Does it strengthen prompt → preview → diff → merge? *(Required: yes)*
2. **Local-first integrity** — Source/secrets/scans stay on machine? *(Required: yes or opt-in)*
3. **Artifact discipline** — Can it be modeled as a stable artifact? *(Required: yes)*
4. **Trust earned** — Does it make diff more reviewable, render more explainable, rollback more reliable?
5. **Tier fit** — Is it obviously Free / Pro / Team / Enterprise?

---

## Out of Scope (v1)

| Item | Status | Rationale |
|------|--------|-----------|
| Autonomous design decisions | Out (permanent) | Violates ChangeSet trust |
| Generic AI chat | Out (permanent) | Cursor already wins |
| Vue / Angular / Web Components | Watch list | Re-evaluate after React SOM |
| React Native / Remix / Astro | Out for v1 | Frame-shape mismatch |
| Pure CSS-in-JS-only | Out for v1 | Top-20 covers 90%+ |
| Windows / Linux | Watch list | After macOS PMF |
| On-prem hosting | Watch list | Enterprise ask only |
