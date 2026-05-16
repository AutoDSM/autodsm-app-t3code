# Process Model

<!-- AGENT_CONTEXT
type: architecture
scope: process-model
relates_to:
  - ./system-overview.md
  - ./security-model.md
key_services:
  - ProjectService
  - Indexer
  - RenderRuntime
  - Scanner
  - AgentSupervisor
  - GitEngine
  - CredentialResolver
  - SettingsStore
-->

## Quick Reference

| Process  | Runtime        | Responsibility                      |
| -------- | -------------- | ----------------------------------- |
| Main     | Node.js        | Service orchestration, IPC handling |
| Renderer | Chromium       | React UI, user interaction          |
| Sidecar  | Node.js (Vite) | Component preview, HMR              |
| Workers  | Node.js        | AST scanning, drift detection       |

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          macOS Host                                       │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────────────────┐      ┌─────────────────────────────┐   │
│  │     Electron Main           │      │     Electron Renderer        │   │
│  │     (Node.js)               │      │     (Chromium)               │   │
│  │                             │      │                              │   │
│  │  ┌───────────────────────┐  │      │  ┌────────────────────────┐  │   │
│  │  │ ProjectService        │  │      │  │ React App Shell        │  │   │
│  │  │ • Open/close projects │  │      │  │ • Component Workbench  │  │   │
│  │  └───────────────────────┘  │ IPC  │  │ • Preview Canvas       │  │   │
│  │                             │◄────►│  │ • DiffSlideOver        │  │   │
│  │  ┌───────────────────────┐  │      │  │ • Issues Panel         │  │   │
│  │  │ Indexer (Worker)      │  │      │  └────────────────────────┘  │   │
│  │  │ • AST scanning        │  │      │                              │   │
│  │  │ • Registry building   │  │      │  ┌────────────────────────┐  │   │
│  │  └───────────────────────┘  │      │  │ Preview Iframe         │  │   │
│  │                             │      │  │ • <iframe sandbox>     │  │   │
│  │  ┌───────────────────────┐  │      │  │ • postMessage bridge   │  │   │
│  │  │ RenderRuntime         │  │      │  └────────────────────────┘  │   │
│  │  │ • Vite management     │  │      │                              │   │
│  │  └───────────────────────┘  │      └─────────────────────────────┘   │
│  │                             │                     │                   │
│  │  ┌───────────────────────┐  │                     │ HTTP              │
│  │  │ AgentSupervisor       │  │                     ▼                   │
│  │  │ • CLI orchestration   │  │      ┌─────────────────────────────┐   │
│  │  └───────────────────────┘  │      │     Sidecar Vite            │   │
│  │                             │      │     (Port 5180-5189)        │   │
│  │  ┌───────────────────────┐  │      │  • Virtual modules          │   │
│  │  │ GitEngine             │  │      │  • Provider composition     │   │
│  │  │ • Branch management   │  │      │  • HMR on ChangeSet apply   │   │
│  │  └───────────────────────┘  │      └─────────────────────────────┘   │
│  │                             │                                         │
│  └─────────────────────────────┘      ┌─────────────────────────────┐   │
│                                        │     External CLIs           │   │
│                                        │  • claude (Claude Code)     │   │
│                                        │  • codex (OpenAI)           │   │
│                                        │  • git (native binary)      │   │
│                                        └─────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────┘
```

## Main Process Services

### ProjectService

**Purpose:** Project lifecycle management

```typescript
interface ProjectService {
  open(path: string): Promise<ProjectProfile>;
  close(projectId: string): Promise<void>;
  list(): Promise<ProjectSummary[]>;
  watch(projectId: string, callback: (event: FileEvent) => void): Unsubscribe;
}
```

**Location:** `apps/desktop/src/main/services/ProjectService.ts`

### Indexer (Worker Thread)

**Purpose:** AST scanning and artifact generation

- Runs in dedicated worker thread (never blocks main)
- Generates `BrandProfile` from token sources
- Generates `ComponentRegistry` from AST analysis
- Infers provider chains from entry points
- Watches files and re-indexes on change (debounced)

**Location:** `apps/desktop/src/main/workers/indexer.worker.ts`

### RenderRuntime

**Purpose:** Vite sidecar management

- Spawns Vite in `.autodsm/runtime/`
- Manages port pool (5180–5189)
- Monitors health with watchdogs
- Provides restart capability

**Location:** `apps/desktop/src/main/services/RenderRuntime.ts`

### Scanner (Worker Thread)

**Purpose:** Drift detection and accessibility scanning

- Runs in dedicated worker thread
- Generates `ScanArtifact` from component analysis
- Integrates axe-core for accessibility
- Detects token drift, provider drift, prop misuse

**Location:** `apps/desktop/src/main/workers/scanner.worker.ts`

### AgentSupervisor

**Purpose:** AI provider orchestration

- Resolves provider from 4-tier hierarchy
- Assembles context payload for prompts
- Streams agent output
- Converts `GenerationPlan` to `ChangeSet`

**Location:** `apps/desktop/src/main/services/AgentSupervisor.ts`

### GitEngine

**Purpose:** Version control operations

- Shells out to native `git` binary
- Creates session branches (`autodsm/<slug>-<date>`)
- Commits with hook execution
- Pushes with credential passthrough
- Creates PRs via Octokit

**Location:** `apps/desktop/src/main/services/GitEngine.ts`

### CredentialResolver

**Purpose:** GitHub authentication passthrough

Priority order:

1. `AUTODSM_GITHUB_TOKEN` environment variable
2. `gh auth token` output
3. `git credential fill` helper
4. Keychain (`autodsm/github-token`)

**Location:** `apps/desktop/src/main/services/CredentialResolver.ts`

### SettingsStore

**Purpose:** Preference persistence

- Stores user preferences in `~/.autodsm/settings.json`
- Stores project overrides in project profile
- Provides reactive subscription for UI

**Location:** `apps/desktop/src/main/services/SettingsStore.ts`

## Renderer Process

### React App Shell

| Technology      | Purpose          |
| --------------- | ---------------- |
| TanStack Router | Navigation       |
| Zustand         | State management |
| Tailwind CSS    | Styling          |

### Key Components

| Component         | Location                   | Purpose                      |
| ----------------- | -------------------------- | ---------------------------- |
| ComponentSidebar  | `apps/web/src/components/` | Folder-based component tree  |
| ComponentCanvas   | `apps/web/src/components/` | Preview area with iframe     |
| PropControlsPanel | `apps/web/src/components/` | Auto-generated prop controls |
| PromptBar         | `apps/web/src/components/` | AI prompt input              |
| DiffSlideOver     | `apps/web/src/components/` | Monaco diff viewer           |

## Sidecar Vite Process

### Virtual Modules

| Module                         | Content                |
| ------------------------------ | ---------------------- |
| `virtual:autodsm/manifest`     | Current RenderManifest |
| `virtual:autodsm/component`    | Target component       |
| `virtual:autodsm/providers`    | Composed provider tree |
| `virtual:autodsm/safe-runtime` | Runtime patches        |

### Safe-Runtime Patches

```typescript
// Patched APIs (no-op or safe stubs)
window.fetch = safeFetch;
window.XMLHttpRequest = SafeXHR;
window.localStorage = safeStorage;
window.sessionStorage = safeStorage;
window.WebSocket = SafeWebSocket;
React.useEffect = safeUseEffect;
```

## IPC Communication Pattern

```typescript
// Main process handler
ipcMain.handle("channel:name", async (event, payload) => {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    console.error("IPC validation failed", parsed.error);
    return { error: "validation_failed" };
  }
  // Handle request...
});

// Renderer invocation
const result = await window.autodsm.channel.name(payload);
```

## Lifecycle Events

### Startup Sequence

1. Main process initializes
2. Settings loaded from disk
3. Recent projects list restored
4. Renderer window created
5. Welcome screen or last project opened

### Project Open Sequence

1. `ProjectService.open(path)` called
2. Indexer worker spawned
3. `ProjectProfile` generated
4. Vite sidecar started
5. `BrandProfile` + `ComponentRegistry` indexed
6. UI populated with component tree

### Shutdown Sequence

1. Vite sidecar terminated
2. Worker threads stopped
3. Settings persisted
4. Windows closed
5. Main process exits

## Error Handling

### Structured Error Type

```typescript
type StructuredError = {
  code: string; // Machine-readable
  message: string; // User-friendly
  details?: object; // Diagnostic info
  suggestions?: string[]; // Recovery actions
  stack?: string; // Dev-only, opt-in
};
```

### Error Surfaces

| Surface            | Use Case                |
| ------------------ | ----------------------- |
| RenderFailureCard  | Component render errors |
| HookFailureSurface | Git hook failures       |
| AgentErrorCard     | AI generation errors    |
| ScanErrorBanner    | Scanner failures        |
| Toast              | Transient errors        |

---

<!-- AGENT_ACTIONS
to_create_service: Create in apps/desktop/src/main/services/
to_create_worker: Create in apps/desktop/src/main/workers/
to_create_component: Create in apps/web/src/components/
to_add_ipc_channel: Define in src/shared/ipc/channels.ts
-->
