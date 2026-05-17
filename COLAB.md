# T3 Code - Complete Architecture Documentation

> A comprehensive guide to understanding T3 Code's architecture for developers building on top of this platform.

## Table of Contents

1. [Overview](#overview)
2. [High-Level Architecture](#high-level-architecture)
3. [Project Structure](#project-structure)
4. [Backend Architecture](#backend-architecture)
5. [Frontend Architecture](#frontend-architecture)
6. [Desktop (Electron) Architecture](#desktop-electron-architecture)
7. [Shared Packages](#shared-packages)
8. [Communication Patterns](#communication-patterns)
9. [Data Flow](#data-flow)
10. [Startup Sequences](#startup-sequences)
11. [Provider Integration](#provider-integration)
12. [State Management](#state-management)
13. [Database & Persistence](#database--persistence)
14. [Authentication](#authentication)
15. [Build & Deployment](#build--deployment)
16. [Extension Points](#extension-points)

---

## Overview

T3 Code is a minimal web GUI for coding agents (Codex, Claude, OpenCode). It provides a unified interface for interacting with multiple AI coding assistants through both a web application and an Electron desktop app.

### Key Technologies

| Component        | Technology                       |
| ---------------- | -------------------------------- |
| Desktop App      | Electron 41.5.0                  |
| Backend          | Node.js/Bun + Effect.js          |
| Frontend         | React 19.2.6 + Vite 8.0          |
| State Management | Zustand + Effect.js Atoms        |
| Styling          | Tailwind CSS v4                  |
| Database         | SQLite (native Node.js bindings) |
| Terminal         | node-pty + xterm.js              |
| Package Manager  | Bun 1.3.11                       |
| Build System     | Turbo + tsdown                   |

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              T3 CODE SYSTEM                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐    │
│  │   DESKTOP APP    │     │    WEB APP       │     │   CLI (npx t3)   │    │
│  │   (Electron)     │     │   (Browser)      │     │                  │    │
│  │                  │     │                  │     │                  │    │
│  │  ┌────────────┐  │     │  ┌────────────┐  │     │                  │    │
│  │  │  Web View  │  │     │  │   React    │  │     │                  │    │
│  │  │  (React)   │  │     │  │    UI      │  │     │                  │    │
│  │  └─────┬──────┘  │     │  └─────┬──────┘  │     │                  │    │
│  │        │ IPC     │     │        │ HTTP/WS │     │                  │    │
│  │  ┌─────▼──────┐  │     │        │         │     │                  │    │
│  │  │   Main     │  │     │        │         │     │                  │    │
│  │  │  Process   │──┼─────┼────────┼─────────┼─────┤                  │    │
│  │  └─────┬──────┘  │     │        │         │     │                  │    │
│  └────────┼─────────┘     └────────┼─────────┘     └────────┬─────────┘    │
│           │                        │                        │               │
│           │ spawn                  │                        │               │
│           ▼                        ▼                        ▼               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         BACKEND SERVER                               │   │
│  │                        (apps/server - t3)                            │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │   │
│  │  │   HTTP      │  │  WebSocket  │  │ Orchestr.   │  │  Provider  │  │   │
│  │  │   Router    │  │    RPC      │  │   Engine    │  │  Registry  │  │   │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬─────┘  │   │
│  │         │                │                │                │         │   │
│  │         └────────────────┴────────────────┴────────────────┘         │   │
│  │                                   │                                   │   │
│  │  ┌────────────────────────────────┴───────────────────────────────┐  │   │
│  │  │                      SERVICE LAYER                              │  │   │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │  │   │
│  │  │  │ Terminal │ │   Git    │ │Workspace │ │ Project  │          │  │   │
│  │  │  │ Manager  │ │ Manager  │ │  FS      │ │ Manager  │          │  │   │
│  │  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │  │   │
│  │  └────────────────────────────────────────────────────────────────┘  │   │
│  │                                   │                                   │   │
│  │  ┌────────────────────────────────┴───────────────────────────────┐  │   │
│  │  │                    PERSISTENCE LAYER                            │  │   │
│  │  │            SQLite (Event Store + Projections)                   │  │   │
│  │  └────────────────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                   │                                         │
│                                   ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                       AI PROVIDER LAYER                              │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐            │   │
│  │  │  Claude  │  │  Codex   │  │ OpenCode │  │  Cursor  │            │   │
│  │  │  Driver  │  │  Driver  │  │  Driver  │  │  Driver  │            │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
t3code/
├── apps/
│   ├── desktop/              # Electron desktop application
│   │   ├── src/
│   │   │   ├── main.ts       # Entry point
│   │   │   ├── preload.ts    # Preload script
│   │   │   ├── app/          # Core app logic
│   │   │   ├── backend/      # Backend process management
│   │   │   ├── electron/     # Electron wrappers
│   │   │   ├── ipc/          # IPC handlers
│   │   │   ├── window/       # Window management
│   │   │   └── settings/     # Settings persistence
│   │   └── dist-electron/    # Compiled output
│   │
│   ├── server/               # Backend server (t3 CLI)
│   │   ├── src/
│   │   │   ├── bin.ts        # CLI entry point
│   │   │   ├── server.ts     # Server layer setup
│   │   │   ├── http.ts       # HTTP routes
│   │   │   ├── ws.ts         # WebSocket RPC
│   │   │   ├── auth/         # Authentication
│   │   │   ├── orchestration/# Event sourcing engine
│   │   │   ├── provider/     # AI provider integration
│   │   │   ├── terminal/     # PTY management
│   │   │   ├── git/          # Git operations
│   │   │   ├── workspace/    # File system
│   │   │   └── persistence/  # SQLite layer
│   │   └── dist/             # Compiled output
│   │
│   ├── web/                  # React web application
│   │   ├── src/
│   │   │   ├── main.tsx      # React entry
│   │   │   ├── router.ts     # TanStack Router
│   │   │   ├── store.ts      # Zustand store
│   │   │   ├── routes/       # File-based routes
│   │   │   ├── components/   # React components
│   │   │   ├── hooks/        # Custom hooks
│   │   │   ├── rpc/          # WebSocket client
│   │   │   └── lib/          # Utilities
│   │   └── dist/             # Built assets
│   │
│   └── marketing/            # Marketing site
│
├── packages/
│   ├── contracts/            # API definitions (RPC schemas)
│   ├── shared/               # Shared utilities
│   ├── client-runtime/       # Client runtime utilities
│   ├── ssh/                  # SSH tunneling
│   └── tailscale/            # Tailscale integration
│
├── scripts/                  # Build & utility scripts
├── package.json              # Root workspace config
└── turbo.json                # Turborepo config
```

---

## Backend Architecture

### Server Entry & Startup

```
┌─────────────────────────────────────────────────────────────────┐
│                    SERVER STARTUP SEQUENCE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  bin.ts                                                          │
│    │                                                             │
│    ▼                                                             │
│  CLI Commands (start, serve, auth, project)                      │
│    │                                                             │
│    ▼                                                             │
│  server.ts → makeServerLayer()                                   │
│    │                                                             │
│    ├──► PlatformServicesLive (Bun/Node abstraction)             │
│    ├──► PersistenceLayerLive (SQLite client)                    │
│    ├──► ProviderLayerLive (Provider registry)                   │
│    ├──► AuthLayerLive (Authentication)                          │
│    ├──► ReactorLayerLive (Event reactors)                       │
│    ├──► TerminalLayerLive (PTY manager)                         │
│    └──► RuntimeServicesLive (All dependencies)                  │
│           │                                                      │
│           ▼                                                      │
│    serverRuntimeStartup.ts                                       │
│      │                                                           │
│      ├──► Command queue during startup                          │
│      ├──► markHttpListening() signals ready                     │
│      └──► Migrations run automatically                          │
│           │                                                      │
│           ▼                                                      │
│    HTTP Server listening (default: 13773)                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### HTTP Routes

| Route                          | Method          | Purpose                       |
| ------------------------------ | --------------- | ----------------------------- |
| `/.well-known/t3/environment`  | GET             | Server environment descriptor |
| `/api/observability/v1/traces` | POST            | OTLP trace proxy              |
| `/api/attachments/*`           | GET             | File attachment downloads     |
| `/api/project-favicon`         | GET             | Project favicon resolution    |
| `/auth/bootstrap`              | POST            | Exchange bootstrap credential |
| `/auth/pairing-links`          | GET/POST/DELETE | Pairing code management       |
| `/auth/clients`                | GET/DELETE      | Session management            |
| `/auth/ws-token`               | POST            | WebSocket token issuance      |

### WebSocket RPC Methods

```typescript
// From packages/contracts/src/rpc.ts

// Orchestration Methods
orchestration.dispatchCommand; // Send orchestration command
orchestration.getTurnDiff; // Get diff for a turn
orchestration.getFullThreadDiff; // Get all diffs for thread
orchestration.replayEvents; // Replay events from sequence

// Project Methods
projects.list; // List all projects
projects.add; // Add new project
projects.remove; // Remove project
projects.searchEntries; // Search project files
projects.writeFile; // Write file to project

// Terminal Methods
terminal.open; // Open new terminal
terminal.write; // Send input to terminal
terminal.resize; // Resize terminal
terminal.clear; // Clear terminal
terminal.restart; // Restart terminal
terminal.close; // Close terminal

// VCS Methods
vcs.pull; // Pull changes
vcs.listRefs; // List branches/tags
vcs.createWorktree; // Create git worktree
vcs.createRef; // Create branch/tag
vcs.switchRef; // Switch branch
vcs.init; // Initialize repo

// Server Methods
server.getConfig; // Get server configuration
server.refreshProviders; // Refresh provider statuses
server.updateProvider; // Update provider config
server.updateKeybindings; // Update keybindings
server.updateSettings; // Update settings

// Subscription Streams
server.subscribeConfig; // Config updates stream
server.subscribeLifecycle; // Lifecycle events stream
server.subscribeShellSnapshot; // All threads metadata stream
server.subscribeThreadDetail; // Active thread detail stream
terminal.subscribeEvents; // Terminal output stream
vcs.subscribeStatus; // VCS status stream
```

### Orchestration Engine (Event Sourcing)

```
┌─────────────────────────────────────────────────────────────────┐
│                   EVENT SOURCING ARCHITECTURE                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Client Command                                                  │
│       │                                                          │
│       ▼                                                          │
│  ┌─────────────────┐                                            │
│  │   Normalizer    │  Validates & normalizes commands            │
│  │                 │  Persists image attachments                 │
│  └────────┬────────┘                                            │
│           │                                                      │
│           ▼                                                      │
│  ┌─────────────────┐                                            │
│  │    Decider      │  Pure function decision logic               │
│  │                 │  Validates invariants                       │
│  │                 │  Generates domain events                    │
│  └────────┬────────┘                                            │
│           │                                                      │
│           ▼                                                      │
│  ┌─────────────────┐                                            │
│  │  Event Store    │  SQLite: OrchestrationEvents table          │
│  │                 │  Sequence numbers for ordering              │
│  │                 │  Command receipts for deduplication         │
│  └────────┬────────┘                                            │
│           │                                                      │
│           ├──────────────────────────────────────┐               │
│           │                                      │               │
│           ▼                                      ▼               │
│  ┌─────────────────┐                  ┌─────────────────┐       │
│  │   Projector     │                  │    Reactors     │       │
│  │                 │                  │                 │       │
│  │ In-memory read  │                  │ Side effects:   │       │
│  │ model (threads, │                  │ - Provider cmds │       │
│  │ messages, etc.) │                  │ - Checkpoints   │       │
│  └────────┬────────┘                  │ - Deletions     │       │
│           │                           └─────────────────┘       │
│           ▼                                                      │
│  ┌─────────────────┐                                            │
│  │ Snapshot Query  │  Materializes snapshots for clients         │
│  │    Service      │  Optimized indexes for fast lookups         │
│  └─────────────────┘                                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Database Schema (SQLite)

```sql
-- Core Event Store
CREATE TABLE OrchestrationEvents (
    sequence INTEGER PRIMARY KEY,
    event_type TEXT NOT NULL,
    event_data JSON NOT NULL,
    created_at TEXT NOT NULL
);

-- Command Deduplication
CREATE TABLE OrchestrationCommandReceipts (
    command_id TEXT PRIMARY KEY,
    sequence INTEGER NOT NULL,
    created_at TEXT NOT NULL
);

-- Checkpoint Diffs
CREATE TABLE CheckpointDiffBlobs (
    id TEXT PRIMARY KEY,
    turn_id TEXT NOT NULL,
    diff_data BLOB NOT NULL
);

-- Provider Session Tracking
CREATE TABLE ProviderSessionRuntime (
    thread_id TEXT PRIMARY KEY,
    driver_kind TEXT NOT NULL,
    instance_id TEXT NOT NULL,
    runtime_mode TEXT,
    instance_id TEXT
);

-- Read Model Projections
CREATE TABLE Projections (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    data JSON NOT NULL,
    updated_at TEXT NOT NULL
);

-- Authentication
CREATE TABLE AuthAccessManagement (
    session_id TEXT PRIMARY KEY,
    role TEXT NOT NULL,
    expires_at TEXT,
    client_metadata JSON
);
```

---

## Frontend Architecture

### Component Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  main.tsx                                                        │
│    │                                                             │
│    ▼                                                             │
│  RouterProvider (TanStack Router)                                │
│    │                                                             │
│    ▼                                                             │
│  __root.tsx                                                      │
│    │                                                             │
│    ├──► Auth Gate (check authentication)                        │
│    ├──► Environment Bootstrap                                   │
│    ├──► QueryClientProvider (React Query)                       │
│    ├──► AppAtomRegistryProvider (Effect.js)                     │
│    └──► Global Components:                                       │
│         ├── CommandPalette                                       │
│         ├── WebSocketConnectionSurface                           │
│         └── Toasts                                               │
│           │                                                      │
│           ▼                                                      │
│  _chat.tsx (Chat Layout)                                         │
│    │                                                             │
│    ├──► Global Keyboard Shortcuts                               │
│    ├──► Terminal Focus Tracking                                 │
│    └──► Protected Route                                          │
│           │                                                      │
│           ▼                                                      │
│  _chat.$environmentId.$threadId.tsx (Thread View)                │
│    │                                                             │
│    ├──► Sidebar + SidebarRail                                   │
│    ├──► ChatView (main thread)                                  │
│    └──► DiffPanel (code changes)                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Route Structure

```
/                           # Root (redirects to chat)
├── /pair                   # Pairing/authentication
├── /_chat                  # Chat layout (protected)
│   ├── /$environmentId
│   │   └── /$threadId      # Thread detail view
│   └── /draft
│       └── /$draftId       # Draft thread creation
└── /settings               # Settings pages
    ├── /general
    ├── /providers
    ├── /keybindings
    ├── /source-control
    └── /diagnostics
```

### Component Categories

```
/components/
├── chat/                   # Chat-specific (60+ files)
│   ├── MessagesTimeline.tsx      # Message list (virtualized)
│   ├── ChatMarkdown.browser.tsx  # Markdown rendering
│   ├── ChatComposer.tsx          # Message input
│   ├── ComposerPromptEditor.tsx  # Rich text editor
│   ├── ProviderModelPicker.tsx   # Model selection
│   ├── ProposedPlanCard.tsx      # AI plan display
│   ├── DiffPanelShell.tsx        # Diff viewer
│   └── ContextWindowMeter.tsx    # Token usage
│
├── ui/                     # Base components (shadcn/ui style)
│   ├── button.tsx
│   ├── input.tsx
│   ├── popover.tsx
│   ├── sidebar.tsx
│   └── ...
│
├── sidebar/                # Sidebar components
│   ├── ProjectList.tsx
│   ├── ThreadList.tsx
│   └── ...
│
├── settings/               # Settings UI
│   ├── GeneralSettings.tsx
│   ├── ProviderSettings.tsx
│   └── ...
│
├── auth/                   # Authentication
│   └── PairingPage.tsx
│
└── desktop/                # Electron-specific
    └── WindowControls.tsx
```

---

## Desktop (Electron) Architecture

### Electron Process Model

```
┌─────────────────────────────────────────────────────────────────┐
│                    ELECTRON ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    MAIN PROCESS                          │    │
│  │                    (main.ts)                             │    │
│  │                                                          │    │
│  │  ┌────────────────────────────────────────────────────┐ │    │
│  │  │              Effect.js Layer Composition            │ │    │
│  │  │                                                     │ │    │
│  │  │  electronLayer:                                     │ │    │
│  │  │    ├── ElectronApp                                  │ │    │
│  │  │    ├── ElectronWindow                               │ │    │
│  │  │    ├── ElectronDialog                               │ │    │
│  │  │    ├── ElectronMenu                                 │ │    │
│  │  │    ├── ElectronProtocol                             │ │    │
│  │  │    ├── ElectronTheme                                │ │    │
│  │  │    ├── ElectronUpdater                              │ │    │
│  │  │    └── ElectronSafeStorage                          │ │    │
│  │  │                                                     │ │    │
│  │  │  desktopFoundationLayer:                            │ │    │
│  │  │    ├── DesktopState                                 │ │    │
│  │  │    ├── DesktopSettings                              │ │    │
│  │  │    ├── DesktopAssets                                │ │    │
│  │  │    └── DesktopObservability                         │ │    │
│  │  │                                                     │ │    │
│  │  │  desktopBackendLayer:                               │ │    │
│  │  │    ├── DesktopBackendManager                        │ │    │
│  │  │    └── DesktopServerExposure                        │ │    │
│  │  │                                                     │ │    │
│  │  │  desktopApplicationLayer:                           │ │    │
│  │  │    ├── DesktopApplicationMenu                       │ │    │
│  │  │    ├── DesktopShellEnvironment                      │ │    │
│  │  │    └── DesktopUpdates                               │ │    │
│  │  └────────────────────────────────────────────────────┘ │    │
│  │                         │                                │    │
│  │                         │ IPC                            │    │
│  │                         ▼                                │    │
│  │  ┌────────────────────────────────────────────────────┐ │    │
│  │  │              IPC Handler Registry                   │ │    │
│  │  │                                                     │ │    │
│  │  │  Window/UI:        Settings:         SSH:           │ │    │
│  │  │  - pick-folder     - get-client      - discover     │ │    │
│  │  │  - confirm         - set-client      - ensure       │ │    │
│  │  │  - set-theme       - get-saved-env   - disconnect   │ │    │
│  │  │  - context-menu    - set-saved-env   - fetch        │ │    │
│  │  │  - open-external                                    │ │    │
│  │  │                                                     │ │    │
│  │  │  Server:           Updates:                         │ │    │
│  │  │  - get-exposure    - get-state                      │ │    │
│  │  │  - set-mode        - set-channel                    │ │    │
│  │  │  - get-endpoints   - download/install               │ │    │
│  │  └────────────────────────────────────────────────────┘ │    │
│  │                         │                                │    │
│  └─────────────────────────┼────────────────────────────────┘    │
│                            │ spawn                               │
│                            ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                 BACKEND PROCESS                          │    │
│  │                 (apps/server)                            │    │
│  │                                                          │    │
│  │  Spawned by DesktopBackendManager                        │    │
│  │  Communicates via HTTP/WebSocket                         │    │
│  │  Port: 3773 (default, scanned for availability)          │    │
│  │                                                          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                            ▲                                     │
│                            │ HTTP/WS                             │
│                            │                                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                  RENDERER PROCESS                        │    │
│  │                  (BrowserWindow)                         │    │
│  │                                                          │    │
│  │  ┌────────────────────────────────────────────────────┐ │    │
│  │  │                 React Web App                       │ │    │
│  │  │                 (apps/web)                          │ │    │
│  │  │                                                     │ │    │
│  │  │  - Loaded from backend server                       │ │    │
│  │  │  - Uses hash-based routing in Electron              │ │    │
│  │  │  - Communicates via preload bridge for IPC          │ │    │
│  │  │  - WebSocket to backend for RPC                     │ │    │
│  │  └────────────────────────────────────────────────────┘ │    │
│  │                                                          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### IPC Channel Reference

| Channel                                   | Type  | Purpose               |
| ----------------------------------------- | ----- | --------------------- |
| `desktop:get-app-branding`                | Sync  | Get app branding info |
| `desktop:get-local-environment-bootstrap` | Sync  | Get bootstrap config  |
| `desktop:pick-folder`                     | Async | Native folder picker  |
| `desktop:confirm`                         | Async | Native confirm dialog |
| `desktop:set-theme`                       | Async | Set light/dark theme  |
| `desktop:context-menu`                    | Async | Show context menu     |
| `desktop:open-external`                   | Async | Open URL in browser   |
| `desktop:get-client-settings`             | Async | Get client settings   |
| `desktop:set-client-settings`             | Async | Save client settings  |
| `desktop:get-server-exposure-state`       | Async | Get network exposure  |
| `desktop:set-server-exposure-mode`        | Async | Set network mode      |
| `desktop:update-check`                    | Async | Check for updates     |
| `desktop:update-download`                 | Async | Download update       |
| `desktop:update-install`                  | Async | Install update        |

---

## Shared Packages

### @t3tools/contracts

The central API definition package containing RPC schemas.

```typescript
// Key exports from packages/contracts/src/

// RPC Method Definitions
export const WS_METHODS = {
  projects: { list, add, remove, searchEntries, writeFile },
  shell: { openInEditor },
  filesystem: { browse },
  vcs: { pull, listRefs, createWorktree, ... },
  terminal: { open, write, resize, clear, ... },
  server: { getConfig, refreshProviders, ... },
};

export const ORCHESTRATION_WS_METHODS = {
  orchestration: { dispatchCommand, getTurnDiff, ... },
};

// Schema Definitions
export const ThreadSchema = Schema.Struct({ ... });
export const MessageSchema = Schema.Struct({ ... });
export const ProviderConfigSchema = Schema.Struct({ ... });

// Desktop Bootstrap
export const DesktopBackendBootstrap = Schema.Struct({
  mode: Schema.Literal("desktop"),
  noBrowser: Schema.Boolean,
  port: Schema.Number,
  t3Home: Schema.String,
  host: Schema.String,
  desktopBootstrapToken: Schema.String,
  tailscaleServeEnabled: Schema.Boolean,
  tailscaleServePort: Schema.Number,
});
```

### @t3tools/shared

Shared utilities used across apps.

```typescript
// Key exports from packages/shared/

// Logging & Observability
export * from "./logging";
export * from "./observability";

// Git Utilities
export * from "./git";

// Shell Environment
export * from "./shell";

// Network Utilities
export * from "./Net"; // Port checking

// Worker Utilities
export * from "./DrainableWorker";
export * from "./KeyedCoalescingWorker";

// Settings & Keybindings
export * from "./serverSettings";
export * from "./keybindings";
```

---

## Communication Patterns

### WebSocket RPC Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    WEBSOCKET RPC FLOW                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  CLIENT (React)                         SERVER (Node.js)         │
│                                                                  │
│  ┌─────────────────┐                   ┌─────────────────┐      │
│  │  RpcClient      │                   │   RpcServer     │      │
│  │  (Effect.js)    │                   │   (Effect.js)   │      │
│  └────────┬────────┘                   └────────┬────────┘      │
│           │                                     │                │
│           │  1. WebSocket Connect               │                │
│           │ ─────────────────────────────────► │                │
│           │                                     │                │
│           │  2. Auth Token Exchange             │                │
│           │ ◄────────────────────────────────► │                │
│           │                                     │                │
│           │  3. RPC Request (JSON)              │                │
│           │ {                                   │                │
│           │   method: "projects.list",          │                │
│           │   params: {...},                    │                │
│           │   id: "req-123"                     │                │
│           │ } ──────────────────────────────► │                │
│           │                                     │                │
│           │  4. RPC Response (JSON)             │                │
│           │ {                                   │                │
│           │   result: [...],                    │                │
│           │   id: "req-123"                     │                │
│           │ } ◄────────────────────────────── │                │
│           │                                     │                │
│           │  5. Stream Subscriptions            │                │
│           │ ─────────────────────────────────► │                │
│           │                                     │                │
│           │  6. Stream Events                   │                │
│           │ ◄───────────────────────────────── │                │
│           │ ◄───────────────────────────────── │                │
│           │ ◄───────────────────────────────── │                │
│           │                                     │                │
│           │  7. Heartbeat (Ping/Pong)           │                │
│           │ ◄────────────────────────────────► │                │
│           │                                     │                │
└───────────┴─────────────────────────────────────┴────────────────┘
```

### Dual Stream Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   DUAL STREAM ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  The frontend maintains two parallel subscription streams:       │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    SHELL STREAM                          │    │
│  │              (server.subscribeShellSnapshot)             │    │
│  │                                                          │    │
│  │  Purpose: All threads metadata (lightweight)              │    │
│  │                                                          │    │
│  │  Data:                                                   │    │
│  │    - Thread IDs, titles, timestamps                      │    │
│  │    - Session status (connecting/ready/running/error)     │    │
│  │    - Pending approvals count                             │    │
│  │    - Latest message preview                              │    │
│  │    - Branch/worktree info                                │    │
│  │                                                          │    │
│  │  Used by: Sidebar, thread list, navigation               │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   DETAIL STREAM                          │    │
│  │              (server.subscribeThreadDetail)              │    │
│  │                                                          │    │
│  │  Purpose: Active thread full content                      │    │
│  │                                                          │    │
│  │  Data:                                                   │    │
│  │    - Full message history (up to 2000 messages)          │    │
│  │    - Activities and tool calls                           │    │
│  │    - Proposed plans                                      │    │
│  │    - Turn diffs and checkpoints                          │    │
│  │    - Streaming message updates                           │    │
│  │                                                          │    │
│  │  Used by: ChatView, MessagesTimeline, DiffPanel          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Benefits:                                                       │
│    - Efficient bandwidth usage                                  │
│    - Fast sidebar updates without loading full threads          │
│    - Real-time streaming for active thread only                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### Message Send Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    MESSAGE SEND FLOW                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. User types message in ChatComposer                           │
│     │                                                            │
│     ▼                                                            │
│  2. ComposerPromptEditor captures input                          │
│     │                                                            │
│     ▼                                                            │
│  3. useThreadActions().sendMessage() called                      │
│     │                                                            │
│     ▼                                                            │
│  4. RPC: orchestration.dispatchCommand                           │
│     {                                                            │
│       type: "SendTurn",                                          │
│       threadId: "...",                                           │
│       text: "...",                                               │
│       attachments: [...]                                         │
│     }                                                            │
│     │                                                            │
│     ▼                                                            │
│  5. Server: Normalizer validates & stores attachments            │
│     │                                                            │
│     ▼                                                            │
│  6. Server: Decider generates TurnDispatched event               │
│     │                                                            │
│     ▼                                                            │
│  7. Server: Event stored in SQLite                               │
│     │                                                            │
│     ├────────────────────────────────────────┐                   │
│     │                                        │                   │
│     ▼                                        ▼                   │
│  8. Projector updates                   9. ProviderCommandReactor│
│     in-memory state                        sends to AI provider  │
│     │                                        │                   │
│     ▼                                        ▼                   │
│  10. Shell stream notifies             11. Provider streams       │
│      all clients                           response chunks        │
│      │                                       │                   │
│      ▼                                       ▼                   │
│  12. Sidebar shows                     13. MessageReceived events │
│      "running" status                      stored & streamed      │
│                                              │                   │
│                                              ▼                   │
│                                         14. Detail stream updates │
│                                              active thread        │
│                                              │                   │
│                                              ▼                   │
│                                         15. MessagesTimeline      │
│                                              renders response     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Startup Sequences

### Desktop App Startup

```
┌─────────────────────────────────────────────────────────────────┐
│                  DESKTOP APP STARTUP SEQUENCE                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. main.ts executes                                             │
│     │                                                            │
│     ▼                                                            │
│  2. Effect.js layers composed                                    │
│     │                                                            │
│     ▼                                                            │
│  3. DesktopApp.program runs                                      │
│     │                                                            │
│     ├──► 3a. Shell environment setup                            │
│     │        (detect user shell, PATH)                          │
│     │                                                            │
│     ├──► 3b. User data path configured                          │
│     │        (~/.t3 or dev equivalent)                          │
│     │                                                            │
│     ├──► 3c. Settings loaded from disk                          │
│     │                                                            │
│     ├──► 3d. App identity configured                            │
│     │        (version, paths, branding)                         │
│     │                                                            │
│     ├──► 3e. Electron app.whenReady()                           │
│     │                                                            │
│     ├──► 3f. Application menu created                           │
│     │                                                            │
│     └──► 3g. Custom protocols registered                        │
│           │                                                      │
│           ▼                                                      │
│  4. Bootstrap phase                                              │
│     │                                                            │
│     ├──► 4a. Backend port resolved                              │
│     │        (default: 3773, scans if busy)                     │
│     │                                                            │
│     ├──► 4b. IPC handlers registered                            │
│     │                                                            │
│     └──► 4c. Backend process spawned                            │
│           │                                                      │
│           ▼                                                      │
│  5. DesktopBackendManager                                        │
│     │                                                            │
│     ├──► 5a. Creates bootstrap token                            │
│     │                                                            │
│     ├──► 5b. Spawns apps/server process                         │
│     │        with bootstrap envelope via FD                     │
│     │                                                            │
│     └──► 5c. Polls /.well-known/t3/environment                  │
│           │   until server ready                                │
│           │                                                      │
│           ▼                                                      │
│  6. Server ready, window created                                 │
│     │                                                            │
│     ├──► 6a. BrowserWindow opens                                │
│     │                                                            │
│     └──► 6b. Loads http://127.0.0.1:{port}                      │
│           │                                                      │
│           ▼                                                      │
│  7. React app bootstraps in renderer                             │
│     │                                                            │
│     ├──► 7a. Auth gate checks session                           │
│     │                                                            │
│     ├──► 7b. WebSocket connects to backend                      │
│     │                                                            │
│     └──► 7c. Shell & detail streams subscribed                  │
│           │                                                      │
│           ▼                                                      │
│  8. App ready for use                                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Web App Startup (Standalone)

```
┌─────────────────────────────────────────────────────────────────┐
│                   WEB APP STARTUP SEQUENCE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. User runs: npx t3                                            │
│     │                                                            │
│     ▼                                                            │
│  2. CLI starts server (apps/server)                              │
│     │                                                            │
│     ├──► 2a. Migrations run                                     │
│     │                                                            │
│     ├──► 2b. Providers initialized                              │
│     │                                                            │
│     └──► 2c. HTTP server starts                                 │
│           │                                                      │
│           ▼                                                      │
│  3. Server outputs pairing URL                                   │
│     http://localhost:5733/pair#token=XXXX                        │
│     │                                                            │
│     ▼                                                            │
│  4. User opens URL in browser                                    │
│     │                                                            │
│     ▼                                                            │
│  5. React app loads                                              │
│     │                                                            │
│     ├──► 5a. __root.tsx checks auth                             │
│     │                                                            │
│     ├──► 5b. Pairing page shown                                 │
│     │                                                            │
│     └──► 5c. Token exchanged for session                        │
│           │                                                      │
│           ▼                                                      │
│  6. Session established                                          │
│     │                                                            │
│     ├──► 6a. WebSocket connects                                 │
│     │                                                            │
│     ├──► 6b. Streams subscribed                                 │
│     │                                                            │
│     └──► 6c. Redirects to /_chat                                │
│           │                                                      │
│           ▼                                                      │
│  7. Chat interface ready                                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Provider Integration

### Provider Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   PROVIDER ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                  ProviderService                         │    │
│  │          (Cross-provider facade)                         │    │
│  │                                                          │    │
│  │  Methods:                                                │    │
│  │    - startSession(threadId, input)                       │    │
│  │    - sendTurn(input)                                     │    │
│  │    - interruptTurn(input)                                │    │
│  │    - respondToRequest(...)                               │    │
│  │    - stopSession(input)                                  │    │
│  │    - listSessions()                                      │    │
│  │    - getCapabilities(instanceId)                         │    │
│  │    - rollbackConversation(threadId, numTurns)            │    │
│  │    - streamEvents                                        │    │
│  └─────────────────────────┬───────────────────────────────┘    │
│                            │                                     │
│                            ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │               ProviderInstanceRegistry                   │    │
│  │          (Singleton, Map<InstanceId, Instance>)          │    │
│  │                                                          │    │
│  │  Hydrates from:                                          │    │
│  │    - serverSettings.providers.<kind>                     │    │
│  │    - explicit providerInstances config                   │    │
│  │                                                          │    │
│  │  Each instance carries:                                  │    │
│  │    - Captured closures (snapshot, adapter, textGen)      │    │
│  │    - Instance ID, driver kind, display name              │    │
│  │    - Enabled flag                                        │    │
│  └─────────────────────────┬───────────────────────────────┘    │
│                            │                                     │
│                            ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                  ProviderDriver (SPI)                    │    │
│  │          (Abstract interface, not a service)             │    │
│  │                                                          │    │
│  │  Structure:                                              │    │
│  │    - driverKind: "claude" | "codex" | "cursor" | ...     │    │
│  │    - metadata: { displayName, multiInstance }            │    │
│  │    - configSchema: Schema codec                          │    │
│  │    - defaultConfig(): factory                            │    │
│  │    - create(input): Effect → Instance                    │    │
│  └─────────────────────────┬───────────────────────────────┘    │
│                            │                                     │
│         ┌──────────────────┼──────────────────┐                 │
│         │                  │                  │                  │
│         ▼                  ▼                  ▼                  │
│  ┌────────────┐    ┌────────────┐    ┌────────────┐             │
│  │   Claude   │    │   Codex    │    │  OpenCode  │             │
│  │   Driver   │    │   Driver   │    │   Driver   │             │
│  │            │    │            │    │            │             │
│  │ Anthropic  │    │ OpenAI     │    │ opencode   │             │
│  │ Claude SDK │    │ Codex CLI  │    │    SDK     │             │
│  └────────────┘    └────────────┘    └────────────┘             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Adding a New Provider

To add a new AI provider:

1. **Create Driver** in `apps/server/src/provider/Drivers/`

```typescript
// NewProviderDriver.ts
export const NewProviderDriver: ProviderDriver = {
  driverKind: "newprovider",

  metadata: {
    displayName: "New Provider",
    multiInstanceSupported: false,
  },

  configSchema: Schema.Struct({
    apiKey: Schema.String,
    // ... other config
  }),

  defaultConfig: () => ({
    apiKey: "",
  }),

  create: (input) => Effect.gen(function* () {
    // Initialize provider connection
    // Return adapter interface
    return {
      startSession: (threadId) => ...,
      sendTurn: (input) => ...,
      interruptTurn: () => ...,
      // ...
    };
  }),
};
```

2. **Register Driver** in `apps/server/src/provider/builtInDrivers.ts`

```typescript
export const builtInDrivers = [
  ClaudeDriver,
  CodexDriver,
  OpenCodeDriver,
  CursorDriver,
  NewProviderDriver, // Add here
];
```

3. **Add UI Components** in `apps/web/src/components/settings/`

---

## State Management

### Zustand Store Structure

```typescript
// apps/web/src/store.ts

interface AppState {
  // Active environment
  activeEnvironmentId: EnvironmentId | null;

  // Per-environment state
  environmentStateById: Record<EnvironmentId, EnvironmentState>;
}

interface EnvironmentState {
  // Projects
  projectIds: ProjectId[];
  projectById: Record<ProjectId, Project>;

  // Thread metadata (append-only)
  threadIds: ThreadId[];
  threadIdsByProjectId: Record<ProjectId, ThreadId[]>;

  // Thread state (dual-write: shell + detail streams)
  threadShellById: Record<ThreadId, ThreadShell>;
  threadSessionById: Record<ThreadId, ThreadSession | null>;
  threadTurnStateById: Record<ThreadId, ThreadTurnState>;

  // Thread content (detail stream only)
  messageIdsByThreadId: Record<ThreadId, MessageId[]>;
  messageByThreadId: Record<ThreadId, Record<MessageId, ChatMessage>>;
  activityIdsByThreadId: Record<ThreadId, string[]>;
  activityByThreadId: Record<ThreadId, Record<string, Activity>>;
  proposedPlanIdsByThreadId: Record<ThreadId, string[]>;
  proposedPlanByThreadId: Record<ThreadId, Record<string, ProposedPlan>>;
  turnDiffIdsByThreadId: Record<ThreadId, TurnId[]>;
  turnDiffSummaryByThreadId: Record<ThreadId, Record<TurnId, TurnDiffSummary>>;

  // Sidebar summary (shell stream, server-computed)
  sidebarThreadSummaryById: Record<ThreadId, SidebarThreadSummary>;

  // Bootstrap flag
  bootstrapComplete: boolean;
}

// Key methods
const store = create<AppState>((set, get) => ({
  // Bulk hydration from server
  syncServerShellSnapshot: (snapshot) => ...,
  syncServerThreadDetail: (detail) => ...,

  // Event application
  applyOrchestrationEvent: (event) => ...,
  applyOrchestrationEvents: (events) => ...,
  applyShellEvent: (event) => ...,

  // Targeted mutations
  setError: (threadId, error) => ...,
  setThreadBranch: (threadId, branch) => ...,
}));
```

### Effect.js Atoms (Server Config)

```typescript
// apps/web/src/rpc/serverState.ts

// Server configuration atom
export const serverConfigAtom = Atom.make<ServerConfig | null>(null);

// Update notification atom
export const serverConfigUpdatedAtom = Atom.make<{
  source: "snapshot" | "keybindingsUpdated" | "providerStatuses" | "settingsUpdated";
  timestamp: number;
} | null>(null);

// Welcome/lifecycle atom
export const welcomeAtom = Atom.make<WelcomePayload | null>(null);

// Provider status updates
export const providersUpdatedAtom = Atom.make<ProviderStatus[] | null>(null);

// Usage in components
function useServerSettings() {
  const config = useAtomValue(serverConfigAtom);
  return config?.settings ?? defaultSettings;
}
```

---

## Database & Persistence

### Directory Structure

```
~/.t3/                          # Base directory (or ~/.t3code-dev in dev)
├── state/
│   ├── db.sqlite               # Main SQLite database
│   ├── settings.json           # Server settings
│   └── keybindings.json        # Custom keybindings
├── attachments/                # User-uploaded images
├── logs/
│   ├── server.log
│   ├── provider.log
│   └── terminal.log
├── caches/
│   └── provider-status.json
├── worktrees/                  # Git worktrees for multi-branch
└── secrets/                    # Encrypted credentials
```

### Migration System

Migrations run automatically on server startup:

```typescript
// apps/server/src/persistence/Migrations.ts

export const migrations = [
  { name: "001_OrchestrationEvents", up: () => sql`...` },
  { name: "002_OrchestrationCommandReceipts", up: () => sql`...` },
  { name: "003_CheckpointDiffBlobs", up: () => sql`...` },
  // ... 30 migrations total
];
```

---

## Authentication

### Auth Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      AUTH FLOW                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Desktop Mode:                                                   │
│  ─────────────                                                   │
│  1. Main process generates bootstrap token                       │
│  2. Token passed to backend via FD                               │
│  3. Renderer authenticated via desktop bridge                    │
│  4. No manual pairing required                                   │
│                                                                  │
│  Web Mode (npx t3):                                              │
│  ─────────────────                                               │
│  1. Server starts, generates pairing URL                         │
│  2. User opens URL: /pair#token=XXXX                             │
│  3. Token exchanged for session via POST /auth/bootstrap         │
│  4. Session stored in SQLite + cookie                            │
│  5. WebSocket authenticated via /auth/ws-token                   │
│                                                                  │
│  API Endpoints:                                                  │
│  ──────────────                                                  │
│  POST /auth/bootstrap           Exchange bootstrap → session     │
│  POST /auth/bootstrap/bearer    Get long-lived bearer token      │
│  GET  /auth/pairing-links       List active pairing codes        │
│  POST /auth/pairing-links       Create new pairing code          │
│  DELETE /auth/pairing-links/:id Revoke pairing link              │
│  GET  /auth/clients             List active sessions             │
│  DELETE /auth/clients/:id       Revoke session                   │
│  POST /auth/ws-token            Issue WebSocket token            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Build & Deployment

### Development Commands

```bash
# Install dependencies
bun install

# Development (all apps)
bun run dev

# Development (specific apps)
bun run dev:desktop      # Desktop + server
bun run dev:server       # Server only
bun run dev:web          # Web only

# Type checking
bun run typecheck

# Linting & formatting
bun run lint             # Oxlint
bun run fmt              # Oxfmt

# Testing
bun run test
```

### Build Commands

```bash
# Build all apps
bun run build

# Build specific apps
bun run build:desktop    # Desktop + server
bun run build:contracts  # Contracts package

# Build distribution artifacts
bun run dist:desktop:dmg          # macOS DMG
bun run dist:desktop:dmg:arm64    # macOS ARM64
bun run dist:desktop:dmg:x64      # macOS Intel
bun run dist:desktop:linux        # Linux AppImage
bun run dist:desktop:win          # Windows NSIS
bun run dist:desktop:win:arm64    # Windows ARM64
bun run dist:desktop:win:x64      # Windows x64
```

### Deployment Targets

| Target         | Command              | Output           |
| -------------- | -------------------- | ---------------- |
| macOS DMG      | `dist:desktop:dmg`   | `.dmg` installer |
| Linux AppImage | `dist:desktop:linux` | `.AppImage`      |
| Windows NSIS   | `dist:desktop:win`   | `.exe` installer |
| Web (hosted)   | `build:marketing`    | Static site      |
| NPM (CLI)      | `npm publish`        | `npx t3`         |

---

## Extension Points

### Adding New Features

1. **New RPC Method**
   - Define schema in `packages/contracts/src/rpc.ts`
   - Implement handler in `apps/server/src/ws.ts`
   - Add client call in `apps/web/src/rpc/`

2. **New Orchestration Command**
   - Add command type in `packages/contracts/src/orchestration.ts`
   - Handle in `apps/server/src/orchestration/decider.ts`
   - Generate events in `apps/server/src/orchestration/projector.ts`

3. **New UI Component**
   - Create in `apps/web/src/components/`
   - Add to route if needed
   - Connect to store/RPC

4. **New IPC Channel (Desktop)**
   - Define channel in `apps/desktop/src/ipc/channels.ts`
   - Create handler in `apps/desktop/src/ipc/methods/`
   - Register in `apps/desktop/src/ipc/DesktopIpcHandlers.ts`

5. **New Provider**
   - See [Provider Integration](#provider-integration) section

### Key Files for Customization

| Purpose            | File Path                                  |
| ------------------ | ------------------------------------------ |
| Add RPC method     | `packages/contracts/src/rpc.ts`            |
| Server routes      | `apps/server/src/http.ts`                  |
| WebSocket handlers | `apps/server/src/ws.ts`                    |
| Event sourcing     | `apps/server/src/orchestration/decider.ts` |
| Providers          | `apps/server/src/provider/Drivers/`        |
| React routes       | `apps/web/src/routes/`                     |
| Global state       | `apps/web/src/store.ts`                    |
| UI components      | `apps/web/src/components/`                 |
| Desktop IPC        | `apps/desktop/src/ipc/`                    |
| Settings           | `apps/server/src/serverSettings.ts`        |

---

## Quick Reference

### Port Defaults

| Service        | Port  | Notes        |
| -------------- | ----- | ------------ |
| Backend Server | 13773 | Web mode     |
| Backend Server | 3773  | Desktop mode |
| Web Dev Server | 5733  | Vite dev     |

### Environment Variables

```bash
# Web app (Vite)
VITE_WS_URL=ws://localhost:13773
VITE_HOSTED_APP_URL=https://...
APP_VERSION=0.0.24

# Server
T3_HOME=~/.t3
T3_PORT=13773
T3_LOG_LEVEL=info
```

### Key Dependencies

| Package                  | Version       | Purpose            |
| ------------------------ | ------------- | ------------------ |
| `effect`                 | 4.0.0-beta.59 | Functional effects |
| `electron`               | 41.5.0        | Desktop app        |
| `react`                  | 19.2.6        | UI framework       |
| `vite`                   | 8.0.0         | Build tool         |
| `@tanstack/react-router` | 1.160.2       | Routing            |
| `zustand`                | 5.0.11        | State management   |
| `xterm`                  | 5.x           | Terminal emulation |
| `node-pty`               | -             | PTY support        |

---

_This documentation was generated to help developers understand and extend T3 Code. For the latest updates, refer to the source code and official documentation._
