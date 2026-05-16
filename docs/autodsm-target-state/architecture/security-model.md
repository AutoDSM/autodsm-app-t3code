# Security Model

<!-- AGENT_CONTEXT
type: architecture
scope: security
criticality: high
relates_to:
  - ./system-overview.md
  - ./process-model.md
key_rules:
  - Local-first is non-negotiable
  - contextIsolation: true always
  - nodeIntegration: false always
  - sandbox: true always
  - Tokens never logged
  - Agent output never auto-executed
-->

## Core Principle

> **Local-first is non-negotiable.**
>
> Source code, secrets, and AST scans never leave the machine unless the user explicitly publishes a snapshot.

## Quick Reference

| Rule                     | Enforcement                 |
| ------------------------ | --------------------------- |
| No source exfiltration   | Local indexing only         |
| No secret transmission   | Never read, logged, or sent |
| No long-term credentials | Passthrough only            |
| No auto-execution        | ChangeSet review required   |
| Sandbox everything       | Chromium sandbox enabled    |

## Threat Model

### Assets We Protect

| Asset              | Protection                                    |
| ------------------ | --------------------------------------------- |
| Source code        | Never transmitted; local indexing only        |
| API keys / secrets | Never read, logged, or transmitted            |
| Git credentials    | Passthrough only; never stored long-term      |
| GitHub tokens      | In-memory only; Keychain only for device flow |
| User preferences   | Local storage only                            |

### Sources We Don't Trust

| Source           | Mitigation                                     |
| ---------------- | ---------------------------------------------- |
| Renderer process | Sandboxed, no Node.js access                   |
| Iframe content   | `<iframe sandbox>` with strict CSP             |
| IPC messages     | Zod validation at both ends                    |
| External CLIs    | Output parsed, not evaluated                   |
| Agent output     | Never auto-executed; ChangeSet review required |

## Electron Security Configuration

### BrowserWindow Defaults

```typescript
const window = new BrowserWindow({
  webPreferences: {
    contextIsolation: true, // Isolate preload from renderer
    nodeIntegration: false, // No Node.js in renderer
    sandbox: true, // Full Chromium sandbox
    preload: preloadPath, // Typed bridge only
    webSecurity: true, // Enforce same-origin
    allowRunningInsecureContent: false,
  },
});
```

### Preload Bridge

```typescript
// preload.ts — Only expose typed API
contextBridge.exposeInMainWorld("autodsm", {
  project: {
    open: (path: string) => ipcRenderer.invoke("project:open", path),
    close: (id: string) => ipcRenderer.invoke("project:close", id),
    // ... typed methods only
  },
});
```

**Rules:**

- No raw `ipcRenderer` exposed
- Every method is typed
- No dynamic channel names
- No `eval` or `Function` construction

### Content Security Policy

```typescript
// Main window CSP
'Content-Security-Policy': [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",  // Required for Tailwind
  "connect-src 'self' http://localhost:5180-5189",  // Vite sidecar
  "frame-src http://localhost:5180-5189",  // Preview iframe
].join('; ')
```

### Preview Iframe CSP

```html
<iframe
  sandbox="allow-scripts"
  src="http://localhost:5180/preview/..."
  csp="
    default-src 'self';
    script-src 'self' 'unsafe-eval';
    style-src 'self' 'unsafe-inline';
    connect-src 'none';
    frame-src 'none';
  "
></iframe>
```

## IPC Security

### Validation Pattern

```typescript
ipcMain.handle("project:open", async (event, raw) => {
  // 1. Validate input
  const parsed = ProjectOpenSchema.safeParse(raw);
  if (!parsed.success) {
    console.error("IPC validation failed:", parsed.error);
    throw new Error("Invalid request");
  }

  // 2. Process request
  const result = await projectService.open(parsed.data.path);

  // 3. Validate output
  const output = ProjectProfileSchema.parse(result);
  return output;
});
```

### Channel Audit Checklist

- [ ] All channels defined in central registry
- [ ] All handlers use Zod validation
- [ ] No dynamic channel construction
- [ ] No `eval` or `Function` in handlers
- [ ] No shell command injection vectors

## Credential Handling

### GitHub Token Resolution

```
Priority 1: AUTODSM_GITHUB_TOKEN (env)     → Never logged
Priority 2: gh auth token                   → Output captured, never logged
Priority 3: git credential fill             → From osxkeychain, 1password, etc.
Priority 4: Keychain (autodsm/github-token) → Device flow only
```

### Token Security Rules

1. **Never logged** — Not in console, not in files, not in error reports
2. **Never echoed** — Not in stderr, not in UI, not in prompts
3. **In-memory only** — Except Keychain for device flow
4. **Short-lived** — Resolved per operation, not cached
5. **User-controlled** — Passthrough only, never modified

### Keychain Usage

```typescript
const KEYCHAIN_SERVICE = "autodsm";
const KEYCHAIN_ACCOUNT = "github-token";

// Store (device flow success only)
await keytar.setPassword(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT, token);

// Retrieve (as fallback)
const token = await keytar.getPassword(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT);

// Delete (on sign out)
await keytar.deletePassword(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT);
```

## Agent Security

### Trust Contract

> **The agent never writes raw to disk.**
>
> It proposes a `GenerationPlan`, AutoDSM converts it to a validated `ChangeSet`, the user approves the diff, then writes happen.

### ChangeSet Validation

```typescript
interface ChangeSet {
  id: string;
  sessionId: string;
  summary: string;
  files: FileChange[];
  protectedPaths: string[]; // Never auto-written
  generatedBy: ProviderId;
  validation: ValidationReport;
  createdAt: string;
}

interface ValidationReport {
  typeCheck: ValidationResult; // tsc --noEmit
  lint: ValidationResult; // eslint/oxlint
  scan: ValidationResult; // AutoDSM scanner
  conflicts: ConflictResult; // git merge-base
}
```

### Protected Paths

Never auto-written by agents:

- `.env*` — Environment secrets
- `**/credentials*` — Credential files
- `**/*.pem`, `**/*.key` — Private keys
- `.git/**` — Git internals
- `node_modules/**` — Dependencies

### Agent Output Parsing

```typescript
// Agent output is parsed, never evaluated
const events = [];
for (const line of stdout.split("\n")) {
  if (line.startsWith("{")) {
    try {
      const parsed = AgentEventSchema.safeParse(JSON.parse(line));
      if (parsed.success) {
        events.push(parsed.data);
      }
    } catch {
      // Malformed JSON ignored
    }
  }
}
```

## Safe-Runtime Patches

### Purpose

Prevent component renders from executing side effects.

### Patched APIs

| API              | Patch                          |
| ---------------- | ------------------------------ |
| `fetch`          | No-op, returns empty response  |
| `XMLHttpRequest` | No-op, returns empty response  |
| `localStorage`   | In-memory only                 |
| `sessionStorage` | In-memory only                 |
| `WebSocket`      | No-op                          |
| `useEffect`      | Runs synchronously, no cleanup |

### Toggle

Users can disable patches for debugging:

```typescript
if (settings.safeMode === false) {
  // Use real APIs (for debugging real network behavior)
} else {
  // Apply safe-runtime patches (default)
}
```

## Crash Reports

### Default: Off

```typescript
const crashReporter = {
  enabled: false,
  uploadToServer: false,
  submitURL: null,
};
```

### Opt-in Sentry

```typescript
if (settings.crashReports === "sentry") {
  Sentry.init({
    dsn: SENTRY_DSN,
    beforeSend(event) {
      // Strip sensitive data
      delete event.user;
      delete event.request?.headers;
      delete event.contexts?.device;

      // Strip tokens from breadcrumbs
      event.breadcrumbs = event.breadcrumbs?.filter(
        (b) => !b.message?.includes("token") && !b.message?.includes("credential"),
      );

      return event;
    },
  });
}
```

## Pre-Release Audit Checklist

- [ ] All BrowserWindows have correct security settings
- [ ] Preload exposes only typed bridge
- [ ] All IPC channels use Zod validation
- [ ] No token/credential logging anywhere
- [ ] Protected paths list is complete
- [ ] Safe-runtime patches are comprehensive
- [ ] Crash reports are opt-in only
- [ ] CSP headers are strict
- [ ] Iframe sandbox is enabled
- [ ] No `eval` or `Function` usage
- [ ] No dynamic `require` or `import`
- [ ] No shell command injection vectors

## Enterprise Compliance

| Requirement           | Implementation                                |
| --------------------- | --------------------------------------------- |
| No data exfiltration  | Local-first architecture; opt-in publish only |
| Credential protection | Passthrough only; no long-term storage        |
| Audit trail           | All actions logged locally (git commits)      |
| Access control        | User's git/GitHub permissions enforced        |
| Code signing          | Apple Developer ID signing                    |
| Notarization          | Apple notarization for Gatekeeper             |

---

<!-- AGENT_ACTIONS
before_implementing: Review this security model
when_adding_ipc: Add Zod validation both sides
when_adding_preload: Use typed bridge only
when_handling_tokens: Never log, never store long-term
when_handling_agent_output: Parse only, never evaluate
-->
