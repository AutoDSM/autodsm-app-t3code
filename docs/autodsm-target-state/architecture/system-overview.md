# AutoDSM — System Architecture Overview

## Process Model

```
┌─────────────────────────────────┐     ┌──────────────────────────────────┐
│  Electron Main Process          │     │  Renderer (BrowserWindow)        │
│  ───────────────────────────────│     │  ────────────────────────────────│
│  • ProjectService               │ IPC │  • App shell                     │
│  • Indexer (worker)             │◄───►│  • Component workbench           │
│  • RenderRuntime                │     │  • PreviewCanvas (iframe)        │
│  • Scanner (worker)             │     │  • DiffSlideOver                 │
│  • AgentSupervisor              │     │  • SubmitChangesButton           │
│  • GitEngine                    │     │  • Issues panel                  │
│  • SettingsStore                │     │  • Sidebar drawers               │
│  • CredentialResolver           │     │                                  │
└─────────────────────────────────┘     └──────────────────────────────────┘
            │
            ├── Sidecar Vite preview server (port 5180–5189)
            ├── User's git binary (spawn child_process)
            ├── User's CLI agents (claude/codex/cursor)
            ├── Octokit.rest → api.github.com (token, in-memory)
            └── keytar → macOS Keychain (only when device-flow OAuth used)
```

## Electron Security Defaults (Non-Negotiable)

| Setting | Value | Rationale |
|---------|-------|-----------|
| `contextIsolation` | `true` | Isolate renderer from Node.js |
| `nodeIntegration` | `false` | No direct Node access in renderer |
| `sandbox` | `true` | Full Chromium sandbox |
| Preload bridge | Typed `window.autodsm.*` | No raw `ipcRenderer` |
| IPC validation | `zod.safeParse` both sides | Mismatch → log + drop |
| Iframe preview | `<iframe sandbox>` | Strict CSP |
| Token handling | Never logged/echoed | No stderr, no error reports |
| Crash reports | Default off | Opt-in only |

**Any deviation from these rules kills enterprise sales.**

## IPC Channel Taxonomy

Channels defined in `src/shared/ipc/channels.ts`:

### ProjectChannels
- `project:open` — Open local folder
- `project:close` — Close project
- `project:list` — List recent projects
- `project:watch` — File system watcher

### IndexerChannels
- `indexer:status` — Indexing progress
- `indexer:registry-diff` — ComponentRegistry changes
- `indexer:brand-diff` — BrandProfile changes

### RenderChannels
- `render:status` — Runtime status (idle/loading/ready/error)
- `render:request` — Request component render
- `render:result` — Render result with manifest

### ScannerChannels
- `scanner:run` — Trigger scan
- `scanner:results` — Scan violations
- `scanner:diff` — Scan delta

### AgentChannels
- `agent:generate` — Start generation
- `agent:cancel` — Cancel current run
- `agent:stream` — Stream events
- `agent:progress` — Progress updates
- `agent:complete` — Generation complete
- `agent:error` — Generation failed

### ChangesetChannels
- `changeset:create` — Create from GenerationPlan
- `changeset:preview` — Preview diff
- `changeset:apply` — Write to disk
- `changeset:rollback` — Undo changes

### GitChannels
- `git:status` — Repository status
- `git:create-branch` — Create session branch
- `git:commit` — Commit with message
- `git:create-pr` — Open pull request
- `git:auth-start` — Begin auth flow
- `git:auth-status` — Auth state

### SettingsChannels
- `settings:get` — Read preferences
- `settings:set` — Write preferences
- `settings:subscribe` — Watch changes

## The Iframe-Bootstrap Render Path

```
Renderer creates <iframe src="http://localhost:5180/preview/<componentId>">
   │
   ▼
Vite sidecar resolves /preview/<componentId>
   │
   ▼
Preview-route plugin emits an HTML shell that imports:
   - virtual:autodsm/manifest      → RenderManifest
   - virtual:autodsm/providers     → Composed provider tree
   - virtual:autodsm/component     → The component itself
   - virtual:autodsm/safe-runtime  → fetch/XHR/storage/useEffect patches
   │
   ▼
React renders the component inside the provider chain
   │
   ▼
Bootstrap posts `autodsm:ready` to the host (via postMessage)
   │
   ▼
Host clears the watchdog; renderer marks status `ready`
```

### Failure Handling

Failures caught at every step with structured `RenderHostMessage` events:

| Event | Trigger | User Surface |
|-------|---------|--------------|
| `render:error` | Component throws | RenderFailureCard with diagnosis |
| `render:timeout` | 8s watchdog fires | Timeout card with retry option |
| `render:unhandled` | Uncaught exception | Structured error with stack |

**Never show a bare stack trace.**

## Directory Structure

```
~/.autodsm/                        # App data directory
├── projects/                      # Project-specific data
│   └── <project-hash>/
│       ├── profile.json           # ProjectProfile
│       ├── brand.json             # BrandProfile
│       ├── registry.json          # ComponentRegistry
│       └── scans/                 # ScanArtifact history
├── runtime/                       # Sidecar Vite workspace
├── snapshots/                     # Screenshot captures
├── changesets/                    # ChangeSet history
└── settings.json                  # User preferences

<project-root>/
└── .autodsm/                      # Per-project runtime (gitignored)
    ├── runtime/                   # Vite sidecar files
    ├── cache/                     # AST cache
    └── logs/                      # Debug logs
```

## Data Flow: Prompt to Merge

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          PROMPT TO MERGE FLOW                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. User types prompt in ComponentPromptBox                              │
│     │                                                                    │
│     ▼                                                                    │
│  2. AgentSupervisor resolves provider (claude → codex → cursor → API)   │
│     │                                                                    │
│     ▼                                                                    │
│  3. Context payload assembled:                                           │
│     • Component source + colocated files                                 │
│     • Prop-table from ComponentRegistry                                  │
│     • Provider chain from inference                                      │
│     • Relevant BrandProfile tokens                                       │
│     • Convention rules                                                   │
│     • Recent ChangeSets for coherence                                    │
│     │                                                                    │
│     ▼                                                                    │
│  4. CLI invoked with structured prompt                                   │
│     │                                                                    │
│     ▼                                                                    │
│  5. Agent streams GenerationPlan                                         │
│     │                                                                    │
│     ▼                                                                    │
│  6. ChangeSet validated (type-check, lint, scan)                         │
│     │                                                                    │
│     ▼                                                                    │
│  7. AgentRunChip lights up: +12 / −4                                     │
│     │                                                                    │
│     ▼                                                                    │
│  8. User clicks chip → DiffSlideOver opens                               │
│     │                                                                    │
│     ├─── [Reject] → Discard ChangeSet, untouched                        │
│     │                                                                    │
│     └─── [Approve] ─────────────────────────────────────────┐            │
│                                                              │            │
│  9. ChangeSet written to disk                                │            │
│     │                                                        │            │
│     ▼                                                        │            │
│  10. Vite HMR re-renders canvas (<500ms)                     │            │
│     │                                                        │            │
│     ▼                                                        │            │
│  11. User clicks "Commit"                                    │            │
│     │                                                        │            │
│     ▼                                                        │            │
│  12. Agent generates commit message → user edits             │            │
│     │                                                        │            │
│     ▼                                                        │            │
│  13. git commit (user's hooks run: husky, gpg sign)          │            │
│     │                                                        │            │
│     ▼                                                        │            │
│  14. User clicks "Open PR"                                   │            │
│     │                                                        │            │
│     ▼                                                        │            │
│  15. git push -u origin <branch>                             │            │
│     │                                                        │            │
│     ▼                                                        │            │
│  16. CredentialResolver.getToken() → Octokit.pulls.create    │            │
│     │                                                        │            │
│     ▼                                                        │            │
│  17. PR polling (every 15s): checks, reviews, mergeability   │            │
│     │                                                        │            │
│     ▼                                                        │            │
│  18. User clicks "Merge" (when state machine allows)         │            │
│     │                                                        │            │
│     ▼                                                        │            │
│  19. Octokit.pulls.merge with sha guard                      │            │
│     │                                                        │            │
│     ▼                                                        │            │
│  20. Archive session, delete local branch, return to default │            │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Credential Resolution (4-Source Priority)

```
1. AUTODSM_GITHUB_TOKEN (workspace env)    ← Power-user override
2. gh auth token                            ← Preferred for most users
3. git credential fill (HTTPS helper)       ← osxkeychain, 1password-cli
4. Keychain { service:'autodsm', account:'github-token' }  ← Device flow only
```

## Merge Button State Machine

```
checks: pending                      → "Waiting for checks…"  (disabled)
checks: failure                      → "Checks failed"        (disabled)
checks: success
  approvals < required               → "Needs N approval(s)"  (disabled)
  approvals ≥ required
    requireUpToDate && behind base   → "Update branch"        (action)
    requireSignedCommits && unsigned → "Configure signing"    (link)
    user lacks merge permission      → "Merge in GitHub"      (link)
    everything green                 → "Merge"                (enabled)
```

**The user never sees an enabled merge button that will fail.**
