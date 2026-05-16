# System Architecture Overview

<!-- AGENT_CONTEXT
type: architecture
scope: system-overview
relates_to:
  - ./process-model.md
  - ./security-model.md
  - ../features/core-features.md
key_concepts:
  - Three-process Electron model
  - IPC channel taxonomy
  - Sidecar Vite runtime
  - Credential resolution
-->

## Quick Reference

| Component    | Technology           | Purpose                  |
| ------------ | -------------------- | ------------------------ |
| Main Process | Node.js              | Service orchestration    |
| Renderer     | React + Chromium     | UI shell                 |
| Sidecar      | Vite                 | Component preview server |
| IPC          | Typed channels + Zod | Process communication    |

## Process Model

```
┌─────────────────────────────┐     ┌──────────────────────────────────┐
│  Electron Main Process      │     │  Renderer (BrowserWindow)        │
│  ───────────────────────────│     │  ────────────────────────────────│
│  • ProjectService           │ IPC │  • App shell                     │
│  • Indexer (worker)         │◄───►│  • Component workbench           │
│  • RenderRuntime            │     │  • PreviewCanvas (iframe)        │
│  • Scanner (worker)         │     │  • DiffSlideOver                 │
│  • AgentSupervisor          │     │  • SubmitChangesButton           │
│  • GitEngine                │     │  • Issues panel                  │
│  • SettingsStore            │     │  • Sidebar drawers               │
│  • CredentialResolver       │     │                                  │
└─────────────────────────────┘     └──────────────────────────────────┘
            │
            ├── Sidecar Vite preview server (port 5180–5189)
            ├── User's git binary (spawn child_process)
            ├── User's CLI agents (claude/codex/cursor)
            ├── Octokit.rest → api.github.com
            └── keytar → macOS Keychain
```

## IPC Channel Taxonomy

### Channel Definitions

All channels defined in `src/shared/ipc/channels.ts`:

| Namespace     | Channels                                            | Direction       |
| ------------- | --------------------------------------------------- | --------------- |
| `project:*`   | open, close, list, watch                            | Renderer ↔ Main |
| `indexer:*`   | status, registry-diff, brand-diff                   | Main → Renderer |
| `render:*`    | status, request, result                             | Renderer ↔ Main |
| `scanner:*`   | run, results, diff                                  | Renderer ↔ Main |
| `agent:*`     | generate, cancel, stream, progress, complete, error | Renderer ↔ Main |
| `changeset:*` | create, preview, apply, rollback                    | Renderer ↔ Main |
| `git:*`       | status, create-branch, commit, create-pr, auth-\*   | Renderer ↔ Main |
| `settings:*`  | get, set, subscribe                                 | Renderer ↔ Main |

### Message Pattern

```typescript
// Main process handler
ipcMain.handle("channel:name", async (event, payload) => {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) return { error: "validation_failed" };
  // Handle request...
});

// Renderer invocation
const result = await window.autodsm.channel.name(payload);
```

## Iframe-Bootstrap Render Path

```
Renderer creates <iframe src="http://localhost:5180/preview/<componentId>">
   │
   ▼
Vite sidecar resolves /preview/<componentId>
   │
   ▼
Preview-route plugin emits HTML shell importing:
   - virtual:autodsm/manifest      → RenderManifest
   - virtual:autodsm/providers     → Composed provider tree
   - virtual:autodsm/component     → The component itself
   - virtual:autodsm/safe-runtime  → fetch/XHR/storage/useEffect patches
   │
   ▼
React renders component inside provider chain
   │
   ▼
Bootstrap posts `autodsm:ready` to host (postMessage)
   │
   ▼
Host clears watchdog; renderer marks status `ready`
```

### Failure Events

| Event              | Trigger            | Surface                          |
| ------------------ | ------------------ | -------------------------------- |
| `render:error`     | Component throws   | RenderFailureCard with diagnosis |
| `render:timeout`   | 8s watchdog fires  | Timeout card with retry          |
| `render:unhandled` | Uncaught exception | Structured error with stack      |

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
1. User types prompt in ComponentPromptBox
   │
   ▼
2. AgentSupervisor resolves provider (claude → codex → cursor → API)
   │
   ▼
3. Context payload assembled:
   • Component source + colocated files
   • Prop-table from ComponentRegistry
   • Provider chain from inference
   • Relevant BrandProfile tokens
   • Convention rules
   • Recent ChangeSets for coherence
   │
   ▼
4. CLI invoked with structured prompt
   │
   ▼
5. Agent streams GenerationPlan
   │
   ▼
6. ChangeSet validated (type-check, lint, scan)
   │
   ▼
7. AgentRunChip lights up: +12 / −4
   │
   ▼
8. User clicks chip → DiffSlideOver opens
   │
   ├─ [Reject] → Discard ChangeSet, untouched
   │
   └─ [Approve] → Write to disk → Vite HMR → Re-render
                        │
                        ▼
              9. User clicks "Commit" → git commit (hooks run)
                        │
                        ▼
              10. User clicks "Open PR" → push → Octokit.pulls.create
                        │
                        ▼
              11. Polling: checks, reviews, mergeability
                        │
                        ▼
              12. User clicks "Merge" → Octokit.pulls.merge
                        │
                        ▼
              13. Archive session, delete branch, return to default
```

## Credential Resolution (4-Source Priority)

```
1. AUTODSM_GITHUB_TOKEN (env)      ← Power-user override
2. gh auth token                    ← Preferred for most users
3. git credential fill (HTTPS)      ← osxkeychain, 1password-cli
4. Keychain (autodsm/github-token)  ← Device flow only
```

## Merge Button State Machine

| Condition                        | Button State                     |
| -------------------------------- | -------------------------------- |
| checks: pending                  | "Waiting for checks…" (disabled) |
| checks: failure                  | "Checks failed" (disabled)       |
| approvals < required             | "Needs N approval(s)" (disabled) |
| requireUpToDate && behind        | "Update branch" (action)         |
| requireSignedCommits && unsigned | "Configure signing" (link)       |
| user lacks merge permission      | "Merge in GitHub" (link)         |
| everything green                 | "Merge" (enabled)                |

---

<!-- AGENT_ACTIONS
to_understand_services: Read ./process-model.md
to_understand_security: Read ./security-model.md
to_implement_ipc: Define channels in src/shared/ipc/channels.ts
to_implement_service: Create service in apps/desktop/src/main/services/
-->
