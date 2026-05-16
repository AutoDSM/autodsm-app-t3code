# AutoDSM — AI Provider Integration

## Provider Hierarchy

AutoDSM supports multiple AI providers in a 4-tier hierarchy:

```
┌─────────────────────────────────────────────────────────────────┐
│                    PROVIDER RESOLUTION                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Tier 1: Claude Code CLI (Preferred)                             │
│  ─────────────────────────────────────                          │
│  Binary: claude                                                  │
│  Auth: User's Claude Code subscription                           │
│  Pros: Full agent capabilities, permission controls              │
│                                                                  │
│  Tier 2: OpenAI Codex CLI                                        │
│  ─────────────────────────────                                  │
│  Binary: codex                                                   │
│  Auth: User's Codex CLI subscription                             │
│  Pros: OpenAI ecosystem, sandbox support                         │
│                                                                  │
│  Tier 3: Cursor Agent CLI                                        │
│  ──────────────────────────                                     │
│  Binary: cursor-agent                                            │
│  Auth: User's Cursor subscription                                │
│  Pros: Cursor ecosystem, editor integration                      │
│                                                                  │
│  Tier 4: Direct API (BYOT)                                       │
│  ──────────────────────────                                     │
│  • Anthropic API (ANTHROPIC_API_KEY)                             │
│  • OpenAI API (OPENAI_API_KEY)                                   │
│  Auth: User's API keys                                           │
│  Pros: Full control, any model                                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Resolution Flow

```typescript
async function resolveProvider(): Promise<Provider> {
  // Check Tier 1: Claude CLI
  if (await binaryExists('claude')) {
    return new ClaudeCliProvider();
  }

  // Check Tier 2: Codex CLI
  if (await binaryExists('codex')) {
    return new CodexCliProvider();
  }

  // Check Tier 3: Cursor CLI
  if (await binaryExists('cursor-agent')) {
    return new CursorCliProvider();
  }

  // Check Tier 4: API keys
  if (process.env.ANTHROPIC_API_KEY) {
    return new AnthropicApiProvider();
  }
  if (process.env.OPENAI_API_KEY) {
    return new OpenAiApiProvider();
  }

  // No provider available
  throw new NoProviderError();
}
```

## CLI Invocation Contracts

### Claude Code CLI

```bash
claude -p "<prompt>" \
  --output-format stream-json \
  --permission-mode acceptEdits \
  --cwd <project-path>
```

**Output format:** JSON lines with event types

```json
{"type": "thinking", "content": "Analyzing component structure..."}
{"type": "tool_use", "tool": "read_file", "path": "src/Button.tsx"}
{"type": "edit", "path": "src/Button.tsx", "content": "..."}
{"type": "complete", "summary": "Updated Button with rounded corners"}
```

### Codex CLI

```bash
codex exec \
  --json \
  --sandbox workspace-write \
  --ask-for-approval never \
  --ephemeral
```

**Output format:** Structured JSON response

```json
{
  "status": "success",
  "files": [
    {"path": "src/Button.tsx", "action": "modify", "content": "..."}
  ],
  "summary": "Updated Button component"
}
```

### Cursor Agent CLI

```bash
cursor-agent -p "<prompt>" \
  --output-format stream-json \
  --cwd <project-path>
```

**Output format:** JSON lines (similar to Claude)

### Direct API (Anthropic)

```typescript
const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 8192,
  system: buildSystemPrompt(context),
  messages: [{ role: 'user', content: prompt }],
});
```

### Direct API (OpenAI)

```typescript
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  max_tokens: 8192,
  messages: [
    { role: 'system', content: buildSystemPrompt(context) },
    { role: 'user', content: prompt },
  ],
});
```

## Context Payload

For every prompt, AutoDSM assembles a rich context:

```typescript
interface AgentContext {
  // Target component
  component: {
    path: string;
    source: string;
    props: PropDefinition[];
    colocatedFiles: string[];  // CSS, types, tests
  };

  // System context
  brand: {
    tokens: TokenSet;
    fonts: FontStack;
    colors: ColorPalette;
  };

  // Component ecosystem
  registry: {
    relatedComponents: ComponentRef[];
    usageSites: UsageSite[];
  };

  // Provider context
  providers: {
    chain: ProviderNode[];
    stubs: string[];
  };

  // Conventions
  conventions: {
    fileNaming: string;
    importOrder: string[];
    classnamePattern: string;
  };

  // History (for coherence)
  recentChangeSets: ChangeSetSummary[];
}
```

## AGENTS.md Generation

AutoDSM generates an `AGENTS.md` file from `BrandProfile` that external CLIs can consume:

```markdown
# Component System Context

## Design Tokens

### Colors
- `primary-600`: #2952CC (use for primary actions)
- `primary-700`: #1E3A8A (use for hover states)
- `neutral-100`: #F5F5F5 (use for backgrounds)

### Spacing
- `sm`: 8px
- `md`: 16px
- `lg`: 24px
- `xl`: 32px

### Typography
- `heading-1`: 32px / 1.2 / 700
- `body`: 16px / 1.5 / 400

## Conventions

### File Naming
- Components: PascalCase (`Button.tsx`)
- Hooks: camelCase with `use` prefix (`useTheme.ts`)
- Utils: camelCase (`formatDate.ts`)

### Import Order
1. React
2. Third-party libraries
3. Internal components
4. Internal utils
5. Styles

### Classnames
- Use Tailwind utilities
- Prefer design tokens over arbitrary values
- Group by: layout, spacing, typography, colors

## Provider Chain
- ThemeProvider (required)
- QueryClientProvider (optional)
- RouterProvider (auto-stubbed in preview)

## Protected Patterns
- Never modify files in `node_modules/`
- Never modify `.env*` files
- Always use tokens instead of hardcoded values
```

## Error Handling

### Provider Not Found

```typescript
class NoProviderError extends Error {
  suggestions = [
    'Install Claude Code: https://claude.ai/claude-code',
    'Install Codex CLI: https://codex.openai.com',
    'Set ANTHROPIC_API_KEY or OPENAI_API_KEY',
  ];
}
```

### Provider Auth Failed

```typescript
class ProviderAuthError extends Error {
  provider: string;
  suggestions = [
    'Run `claude auth login` to authenticate',
    'Check your API key is valid',
  ];
}
```

### Generation Failed

```typescript
class GenerationError extends Error {
  provider: string;
  stage: 'parsing' | 'validation' | 'application';
  partialResult?: Partial<GenerationPlan>;
  suggestions: string[];
}
```

## PATH Gauntlet

CLI binaries must be discoverable. AutoDSM uses a PATH gauntlet:

```typescript
async function findBinary(name: string): Promise<string | null> {
  // 1. Check standard locations
  const standardPaths = [
    '/usr/local/bin',
    '/opt/homebrew/bin',
    `${process.env.HOME}/.local/bin`,
    `${process.env.HOME}/.cargo/bin`,
  ];

  for (const dir of standardPaths) {
    const path = `${dir}/${name}`;
    if (await exists(path)) {
      return path;
    }
  }

  // 2. Check PATH
  const which = await exec(`which ${name}`);
  if (which.stdout.trim()) {
    return which.stdout.trim();
  }

  // 3. Try fix-path (for macOS GUI apps)
  await fixPath();
  const which2 = await exec(`which ${name}`);
  if (which2.stdout.trim()) {
    return which2.stdout.trim();
  }

  return null;
}
```

## User Override

Users can override provider selection per-project:

```json
// .autodsm/settings.json
{
  "preferredProvider": "codex",
  "providerConfig": {
    "claude": {
      "model": "claude-sonnet-4-20250514"
    },
    "openai": {
      "model": "gpt-4o",
      "temperature": 0.7
    }
  }
}
```

## Model Selection

Available models by provider:

| Provider | Models |
|----------|--------|
| Claude CLI | claude-sonnet-4-20250514, claude-opus-4-20250514 |
| Codex CLI | codex-1, codex-2 |
| Cursor CLI | cursor-fast, cursor-pro |
| Anthropic API | claude-sonnet-4-20250514, claude-opus-4-20250514 |
| OpenAI API | gpt-4o, gpt-4o-mini |

## Tier Gating

| Feature | Free | Pro |
|---------|------|-----|
| BYOT (API keys) | ✓ | ✓ |
| CLI providers | ✓ | ✓ |
| Hosted AI credits | — | ✓ |
| Priority models | — | ✓ |
| Generation runs/mo | 10 | Unlimited |
