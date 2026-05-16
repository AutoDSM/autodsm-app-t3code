# AutoDSM — Security Model

## Core Principle

> **Local-first is non-negotiable.**
>
> Source code, secrets, and AST scans never leave the machine unless the user explicitly publishes a snapshot.

---

## Threat Model

### What We Protect

| Asset | Protection |
|-------|------------|
| Source code | Never transmitted; local indexing only |
| API keys / secrets | Never read, logged, or transmitted |
| Git credentials | Passthrough only; never stored long-term |
| GitHub tokens | In-memory only; Keychain only for device flow |
| User preferences | Local storage only |

### What We Don't Trust

| Source | Mitigation |
|--------|------------|
| Renderer process | Sandboxed, no Node.js access |
| Iframe content | `<iframe sandbox>` with strict CSP |
| IPC messages | Zod validation at both ends |
| External CLIs | Output parsed, not evaluated |
| Agent output | Never auto-executed; ChangeSet review required |

---

## Electron Security Configuration

### BrowserWindow Defaults

```typescript
const window = new BrowserWindow({
  webPreferences: {
    contextIsolation: true,      // Isolate preload from renderer
    nodeIntegration: false,      // No Node.js in renderer
    sandbox: true,               // Full Chromium sandbox
    preload: preloadPath,        // Typed bridge only
    webSecurity: true,           // Enforce same-origin
    allowRunningInsecureContent: false,
  }
});
```

### Preload Bridge

```typescript
// preload.ts — Only expose typed API
contextBridge.exposeInMainWorld('autodsm', {
  project: {
    open: (path: string) => ipcRenderer.invoke('project:open', path),
    close: (id: string) => ipcRenderer.invoke('project:close', id),
    // ... typed methods only
  },
  // ... other service facades
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
session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
  callback({
    responseHeaders: {
      ...details.responseHeaders,
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",  // Required for Tailwind
        "connect-src 'self' http://localhost:5180-5189",  // Vite sidecar
        "frame-src http://localhost:5180-5189",  // Preview iframe
      ].join('; ')
    }
  });
});
```

### Preview Iframe CSP

```html
<!-- Even stricter for component preview -->
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

---

## IPC Security

### Validation Pattern

```typescript
// Every IPC handler validates input
ipcMain.handle('project:open', async (event, raw) => {
  // 1. Validate input
  const parsed = ProjectOpenSchema.safeParse(raw);
  if (!parsed.success) {
    console.error('IPC validation failed:', parsed.error);
    throw new Error('Invalid request');
  }

  // 2. Process request
  const result = await projectService.open(parsed.data.path);

  // 3. Validate output
  const output = ProjectProfileSchema.parse(result);
  return output;
});
```

### Channel Audit

All channels are defined in `src/shared/ipc/channels.ts`:

```typescript
export const IPC_CHANNELS = {
  PROJECT_OPEN: 'project:open',
  PROJECT_CLOSE: 'project:close',
  // ... exhaustive list
} as const;

// Type-safe channel access
type ChannelName = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS];
```

**Audit checklist:**
- [ ] All channels defined in central registry
- [ ] All handlers use Zod validation
- [ ] No dynamic channel construction
- [ ] No `eval` or `Function` in handlers
- [ ] No shell command injection vectors

---

## Credential Handling

### GitHub Token Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    CREDENTIAL RESOLUTION                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Priority 1: Environment Variable                                │
│  ─────────────────────────────────                              │
│  if (process.env.AUTODSM_GITHUB_TOKEN) {                        │
│    return process.env.AUTODSM_GITHUB_TOKEN;  // Never logged    │
│  }                                                               │
│                                                                  │
│  Priority 2: GitHub CLI                                          │
│  ─────────────────────────                                      │
│  const token = await exec('gh auth token');                      │
│  if (token) {                                                    │
│    return token.trim();  // Output captured, never logged        │
│  }                                                               │
│                                                                  │
│  Priority 3: Git Credential Helper                               │
│  ──────────────────────────────────                             │
│  const cred = await exec('git credential fill', {                │
│    input: 'protocol=https\nhost=github.com\n'                    │
│  });                                                             │
│  if (cred.password) {                                            │
│    return cred.password;  // From osxkeychain, 1password, etc.   │
│  }                                                               │
│                                                                  │
│  Priority 4: Keychain (Device Flow Only)                         │
│  ────────────────────────────────────────                       │
│  const token = await keytar.getPassword('autodsm', 'github');    │
│  if (token) {                                                    │
│    return token;  // Only set by device-flow OAuth               │
│  }                                                               │
│                                                                  │
│  → Prompt user to authenticate                                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Token Security Rules

1. **Never logged** — Not in console, not in files, not in error reports
2. **Never echoed** — Not in stderr, not in UI, not in prompts
3. **In-memory only** — Except Keychain for device flow
4. **Short-lived** — Resolved per operation, not cached
5. **User-controlled** — Passthrough only, never modified

### Keychain Usage

```typescript
// Only used for device-flow OAuth
const KEYCHAIN_SERVICE = 'autodsm';
const KEYCHAIN_ACCOUNT = 'github-token';

// Store (device flow success only)
await keytar.setPassword(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT, token);

// Retrieve (as fallback)
const token = await keytar.getPassword(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT);

// Delete (on sign out)
await keytar.deletePassword(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT);
```

---

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
  protectedPaths: string[];    // Never auto-written
  generatedBy: ProviderId;
  validation: ValidationReport;
  createdAt: string;
}

interface ValidationReport {
  typeCheck: ValidationResult;  // tsc --noEmit
  lint: ValidationResult;       // eslint/oxlint
  scan: ValidationResult;       // AutoDSM scanner
  conflicts: ConflictResult;    // git merge-base
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
for (const line of stdout.split('\n')) {
  if (line.startsWith('{')) {
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

---

## Safe-Runtime Patches

### Purpose

Prevent component renders from executing side effects.

### Patched APIs

```typescript
// fetch — no-op, returns empty response
window.fetch = async () => new Response('{}', { status: 200 });

// XHR — no-op, returns empty response
class SafeXHR {
  open() {}
  send() { this.onload?.({ target: { response: '{}' } }); }
}

// localStorage — in-memory only
const safeStorage = {
  _data: {},
  getItem(key) { return this._data[key] ?? null; },
  setItem(key, value) { this._data[key] = value; },
  removeItem(key) { delete this._data[key]; },
  clear() { this._data = {}; },
};

// WebSocket — no-op
class SafeWebSocket {
  constructor() {}
  send() {}
  close() {}
}

// useEffect — runs synchronously, no cleanup
const safeUseEffect = (effect) => {
  effect();  // Run immediately, ignore cleanup
};
```

### Toggle

Users can disable patches for debugging:

```typescript
if (settings.safeMode === false) {
  // Use real APIs (for debugging real network behavior)
} else {
  // Apply safe-runtime patches (default)
}
```

---

## Crash Reports

### Default: Off

```typescript
// Crash reports are local-only by default
const crashReporter = {
  enabled: false,
  uploadToServer: false,
  submitURL: null,
};
```

### Opt-in Sentry

```typescript
// User must explicitly enable
if (settings.crashReports === 'sentry') {
  Sentry.init({
    dsn: SENTRY_DSN,
    beforeSend(event) {
      // Strip sensitive data
      delete event.user;
      delete event.request?.headers;
      delete event.contexts?.device;

      // Strip tokens from breadcrumbs
      event.breadcrumbs = event.breadcrumbs?.filter(b =>
        !b.message?.includes('token') &&
        !b.message?.includes('credential')
      );

      return event;
    }
  });
}
```

---

## Audit Checklist

### Pre-Release Security Review

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

### Runtime Monitoring

- Log IPC validation failures (not the payload)
- Log iframe sandbox violations
- Log CSP violations
- Alert on unexpected network requests

---

## Compliance Considerations

### Enterprise Requirements

| Requirement | Implementation |
|-------------|----------------|
| No data exfiltration | Local-first architecture; opt-in publish only |
| Credential protection | Passthrough only; no long-term storage |
| Audit trail | All actions logged locally (git commits) |
| Access control | User's git/GitHub permissions enforced |
| Code signing | Apple Developer ID signing |
| Notarization | Apple notarization for Gatekeeper |

### VPAT / Accessibility (Future)

- Keyboard navigation throughout
- Screen reader support
- Color contrast compliance
- Motion reduction support
