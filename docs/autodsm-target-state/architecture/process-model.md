# AutoDSM — Process Model

## Overview

AutoDSM runs as a **macOS Electron application** with three distinct process types:

1. **Main Process** — Node.js backend, service orchestration
2. **Renderer Process** — React UI in BrowserWindow
3. **Sidecar Process** — Vite preview server for component rendering

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
│  │  │ • File watching       │  │◄────►│  │ • Preview Canvas       │  │   │
│  │  └───────────────────────┘  │ IPC  │  │ • DiffSlideOver        │  │   │
│  │                             │      │  │ • Issues Panel         │  │   │
│  │  ┌───────────────────────┐  │      │  │ • Sidebar              │  │   │
│  │  │ Indexer (Worker)      │  │      │  └────────────────────────┘  │   │
│  │  │ • AST scanning        │  │      │                              │   │
│  │  │ • Registry building   │  │      │  ┌────────────────────────┐  │   │
│  │  │ • Token extraction    │  │      │  │ Preview Iframe         │  │   │
│  │  └───────────────────────┘  │      │  │ • <iframe sandbox>     │  │   │
│  │                             │      │  │ • Loads from Vite      │  │   │
│  │  ┌───────────────────────┐  │      │  │ • postMessage bridge   │  │   │
│  │  │ RenderRuntime         │  │      │  └────────────────────────┘  │   │
│  │  │ • Vite management     │  │      │                              │   │
│  │  │ • Port allocation     │  │      └─────────────────────────────┘   │
│  │  │ • Health monitoring   │  │                     │                   │
│  │  └───────────────────────┘  │                     │ HTTP              │
│  │                             │                     │                   │
│  │  ┌───────────────────────┐  │                     ▼                   │
│  │  │ Scanner (Worker)      │  │      ┌─────────────────────────────┐   │
│  │  │ • Drift detection     │  │      │     Sidecar Vite            │   │
│  │  │ • axe-core a11y       │  │      │     (Port 5180-5189)        │   │
│  │  └───────────────────────┘  │      │                              │   │
│  │                             │      │  • Virtual modules          │   │
│  │  ┌───────────────────────┐  │      │  • Provider composition     │   │
│  │  │ AgentSupervisor       │  │      │  • Safe-runtime patches     │   │
│  │  │ • CLI orchestration   │  │      │  • HMR on ChangeSet apply   │   │
│  │  │ • Stream handling     │  │      │                              │   │
│  │  └───────────────────────┘  │      └─────────────────────────────┘   │
│  │                             │                                         │
│  │  ┌───────────────────────┐  │                                         │
│  │  │ GitEngine             │  │                                         │
│  │  │ • Branch management   │  │      ┌─────────────────────────────┐   │
│  │  │ • Commit/push         │  │      │     External CLIs           │   │
│  │  │ • PR creation         │──┼─────►│                              │   │
│  │  └───────────────────────┘  │      │  • claude (Claude Code)     │   │
│  │                             │      │  • codex (OpenAI)           │   │
│  │  ┌───────────────────────┐  │      │  • cursor-agent (Cursor)    │   │
│  │  │ CredentialResolver    │  │      │  • git (native binary)      │   │
│  │  │ • gh auth token       │  │      │                              │   │
│  │  │ • Keychain access     │  │      └─────────────────────────────┘   │
│  │  │ • Env variable        │  │                                         │
│  │  └───────────────────────┘  │      ┌─────────────────────────────┐   │
│  │                             │      │     GitHub API              │   │
│  │  ┌───────────────────────┐  │      │     (api.github.com)        │   │
│  │  │ SettingsStore         │──┼─────►│                              │   │
│  │  │ • User preferences    │  │      │  • Octokit.pulls.create     │   │
│  │  │ • Project overrides   │  │      │  • Octokit.pulls.merge      │   │
│  │  └───────────────────────┘  │      │  • Check runs polling       │   │
│  │                             │      │                              │   │
│  └─────────────────────────────┘      └─────────────────────────────┘   │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

---

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

### Indexer (Worker Thread)
**Purpose:** AST scanning and artifact generation

- Runs in a dedicated worker thread (never blocks main)
- Generates `BrandProfile` from token sources
- Generates `ComponentRegistry` from AST analysis
- Infers provider chains from entry points
- Watches files and re-indexes on change (debounced)

### RenderRuntime
**Purpose:** Vite sidecar management

- Spawns Vite in `.autodsm/runtime/`
- Manages port pool (5180–5189)
- Monitors health with watchdogs
- Provides restart capability

### Scanner (Worker Thread)
**Purpose:** Drift detection and accessibility scanning

- Runs in a dedicated worker thread
- Generates `ScanArtifact` from component analysis
- Integrates axe-core for accessibility
- Detects token drift, provider drift, prop misuse

### AgentSupervisor
**Purpose:** AI provider orchestration

- Resolves provider from 4-tier hierarchy
- Assembles context payload for prompts
- Streams agent output
- Converts `GenerationPlan` to `ChangeSet`

### GitEngine
**Purpose:** Version control operations

- Shells out to native `git` binary
- Creates session branches (`autodsm/<slug>-<date>`)
- Commits with hook execution
- Pushes with credential passthrough
- Creates PRs via Octokit

### CredentialResolver
**Purpose:** GitHub authentication passthrough

Priority order:
1. `AUTODSM_GITHUB_TOKEN` environment variable
2. `gh auth token` output
3. `git credential fill` helper
4. Keychain (`autodsm/github-token`)

### SettingsStore
**Purpose:** Preference persistence

- Stores user preferences in `~/.autodsm/settings.json`
- Stores project overrides in project profile
- Provides reactive subscription for UI

---

## Renderer Process

### React App Shell
- TanStack Router for navigation
- Zustand for state management
- Tailwind CSS for styling

### Component Workbench
- Component browser (sidebar)
- Preview canvas (center)
- Inspector panel (right)
- Prompt box (bottom)
- Agent chip (status)

### Preview Iframe
- `<iframe sandbox>` with strict CSP
- Loads from Vite sidecar
- Communicates via `postMessage`
- Receives `RenderManifest` updates

### DiffSlideOver
- Opens on agent chip click
- Monaco-based diff viewer
- Per-hunk approve/reject
- PR status card

---

## Sidecar Vite Process

### Virtual Modules
- `virtual:autodsm/manifest` — Current RenderManifest
- `virtual:autodsm/component` — Target component
- `virtual:autodsm/providers` — Composed provider tree
- `virtual:autodsm/safe-runtime` — Runtime patches

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

### Provider Composition
- Builds provider tree from adapter + BrandProfile
- Wraps component in theme, router, query, i18n stubs
- Handles missing context gracefully

### HMR Integration
- On ChangeSet apply → Vite HMR update
- Target: <500ms from approve to visible change

---

## IPC Communication

### Channel Pattern
```typescript
// Main process handler
ipcMain.handle('channel:name', async (event, payload) => {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    console.error('IPC validation failed', parsed.error);
    return { error: 'validation_failed' };
  }
  // Handle request...
});

// Renderer invocation
const result = await window.autodsm.channel.name(payload);
```

### Message Flow
```
Renderer                     Main
   │                           │
   ├── invoke(channel, data) ──►
   │                           │
   │                    ┌──────┴──────┐
   │                    │ zod.parse   │
   │                    │ handle req  │
   │                    │ zod.parse   │
   │                    └──────┬──────┘
   │                           │
   ◄── response ───────────────┤
   │                           │
```

---

## External Process Communication

### CLI Agents
```typescript
// Spawn with structured I/O
const proc = spawn('claude', [
  '-p', prompt,
  '--output-format', 'stream-json',
  '--permission-mode', 'acceptEdits',
  '--cwd', projectPath
], {
  env: { ...process.env, ...agentEnv }
});

// Stream stdout for events
proc.stdout.on('data', (chunk) => {
  const events = parseStreamJson(chunk);
  events.forEach(handleAgentEvent);
});
```

### Git Binary
```typescript
// Always use native git (preserves hooks, signing, helpers)
const result = await execAsync('git', ['commit', '-m', message], {
  cwd: projectPath,
  env: process.env  // Inherit user's git config
});
```

### GitHub API
```typescript
// Octokit with resolved token
const token = await credentialResolver.getToken();
const octokit = new Octokit({ auth: token });

await octokit.pulls.create({
  owner, repo, title, body, head, base
});
```

---

## Lifecycle Events

### Startup
1. Main process initializes
2. Settings loaded from disk
3. Recent projects list restored
4. Renderer window created
5. Welcome screen or last project opened

### Project Open
1. `ProjectService.open(path)` called
2. Indexer worker spawned
3. `ProjectProfile` generated
4. Vite sidecar started
5. `BrandProfile` + `ComponentRegistry` indexed
6. UI populated with component tree

### Shutdown
1. Vite sidecar terminated
2. Worker threads stopped
3. Settings persisted
4. Windows closed
5. Main process exits

---

## Error Handling

### Principle
**Never show a bare stack trace to the user.**

### Error Types
```typescript
type StructuredError = {
  code: string;           // Machine-readable
  message: string;        // User-friendly
  details?: object;       // Diagnostic info
  suggestions?: string[]; // Recovery actions
  stack?: string;         // Dev-only, opt-in
};
```

### Error Surfaces
- **RenderFailureCard** — Component render errors
- **HookFailureSurface** — Git hook failures
- **AgentErrorCard** — AI generation errors
- **ScanErrorBanner** — Scanner failures
- **Toast** — Transient errors
