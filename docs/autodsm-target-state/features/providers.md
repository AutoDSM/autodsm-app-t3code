# AI Provider Integration

<!-- AGENT_CONTEXT
type: features
scope: ai-providers
relates_to:
  - ./core-features.md
  - ../architecture/process-model.md
providers:
  - claude-cli: Claude Code CLI (preferred)
  - codex-cli: OpenAI Codex CLI
  - cursor-cli: Cursor Agent CLI
  - anthropic-api: Anthropic API (BYOT)
  - openai-api: OpenAI API (BYOT)
-->

## Quick Reference

| Priority | Provider      | Auth Source              |
| -------- | ------------- | ------------------------ |
| 1        | Claude CLI    | Claude Code subscription |
| 2        | Codex CLI     | Codex CLI subscription   |
| 3        | Cursor CLI    | Cursor subscription      |
| 4        | Anthropic API | ANTHROPIC_API_KEY        |
| 5        | OpenAI API    | OPENAI_API_KEY           |

## Provider Resolution

```typescript
async function resolveProvider(): Promise<Provider> {
  // Tier 1: Claude CLI
  if (await binaryExists("claude")) {
    return new ClaudeCliProvider();
  }

  // Tier 2: Codex CLI
  if (await binaryExists("codex")) {
    return new CodexCliProvider();
  }

  // Tier 3: Cursor CLI
  if (await binaryExists("cursor-agent")) {
    return new CursorCliProvider();
  }

  // Tier 4: API keys
  if (process.env.ANTHROPIC_API_KEY) {
    return new AnthropicApiProvider();
  }
  if (process.env.OPENAI_API_KEY) {
    return new OpenAiApiProvider();
  }

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

**Output:** JSON lines

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

**Output:** Structured JSON

```json
{
  "status": "success",
  "files": [{ "path": "src/Button.tsx", "action": "modify", "content": "..." }],
  "summary": "Updated Button component"
}
```

### Cursor Agent CLI

```bash
cursor-agent -p "<prompt>" \
  --output-format stream-json \
  --cwd <project-path>
```

### Direct API (Anthropic)

```typescript
const response = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 8192,
  system: buildSystemPrompt(context),
  messages: [{ role: "user", content: prompt }],
});
```

### Direct API (OpenAI)

```typescript
const response = await openai.chat.completions.create({
  model: "gpt-4o",
  max_tokens: 8192,
  messages: [
    { role: "system", content: buildSystemPrompt(context) },
    { role: "user", content: prompt },
  ],
});
```

## Context Payload

```typescript
interface AgentContext {
  // Target component
  component: {
    path: string;
    source: string;
    props: PropDefinition[];
    colocatedFiles: string[];
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

  // History
  recentChangeSets: ChangeSetSummary[];
}
```

## AGENTS.md Generation

AutoDSM generates `AGENTS.md` from `BrandProfile`:

```markdown
# Component System Context

## Design Tokens

### Colors

- `primary-600`: #2952CC (use for primary actions)
- `primary-700`: #1E3A8A (use for hover states)

### Spacing

- `sm`: 8px
- `md`: 16px
- `lg`: 24px

## Conventions

### File Naming

- Components: PascalCase (`Button.tsx`)
- Hooks: camelCase with `use` prefix

### Import Order

1. React
2. Third-party libraries
3. Internal components
4. Styles

### Classnames

- Use Tailwind utilities
- Prefer design tokens over arbitrary values

## Protected Patterns

- Never modify `node_modules/`
- Never modify `.env*` files
- Always use tokens instead of hardcoded values
```

## PATH Gauntlet

CLI binaries must be discoverable:

```typescript
async function findBinary(name: string): Promise<string | null> {
  // 1. Standard locations
  const standardPaths = [
    "/usr/local/bin",
    "/opt/homebrew/bin",
    `${process.env.HOME}/.local/bin`,
    `${process.env.HOME}/.cargo/bin`,
  ];

  for (const dir of standardPaths) {
    const path = `${dir}/${name}`;
    if (await exists(path)) return path;
  }

  // 2. Check PATH
  const which = await exec(`which ${name}`);
  if (which.stdout.trim()) return which.stdout.trim();

  // 3. fix-path for macOS GUI apps
  await fixPath();
  const which2 = await exec(`which ${name}`);
  if (which2.stdout.trim()) return which2.stdout.trim();

  return null;
}
```

## User Override

```json
// .autodsm/settings.json
{
  "preferredProvider": "codex",
  "providerConfig": {
    "claude": { "model": "claude-sonnet-4-20250514" },
    "openai": { "model": "gpt-4o", "temperature": 0.7 }
  }
}
```

## Model Selection

| Provider      | Available Models                                 |
| ------------- | ------------------------------------------------ |
| Claude CLI    | claude-sonnet-4-20250514, claude-opus-4-20250514 |
| Codex CLI     | codex-1, codex-2                                 |
| Cursor CLI    | cursor-fast, cursor-pro                          |
| Anthropic API | claude-sonnet-4-20250514, claude-opus-4-20250514 |
| OpenAI API    | gpt-4o, gpt-4o-mini                              |

## Error Handling

### NoProviderError

```typescript
class NoProviderError extends Error {
  suggestions = [
    "Install Claude Code: https://claude.ai/claude-code",
    "Install Codex CLI: https://codex.openai.com",
    "Set ANTHROPIC_API_KEY or OPENAI_API_KEY",
  ];
}
```

### ProviderAuthError

```typescript
class ProviderAuthError extends Error {
  provider: string;
  suggestions = ["Run `claude auth login` to authenticate", "Check your API key is valid"];
}
```

### GenerationError

```typescript
class GenerationError extends Error {
  provider: string;
  stage: "parsing" | "validation" | "application";
  partialResult?: Partial<GenerationPlan>;
  suggestions: string[];
}
```

## Tier Gating

| Feature            | Free | Pro       |
| ------------------ | ---- | --------- |
| BYOT (API keys)    | Yes  | Yes       |
| CLI providers      | Yes  | Yes       |
| Hosted AI credits  | No   | Yes       |
| Priority models    | No   | Yes       |
| Generation runs/mo | 10   | Unlimited |

---

<!-- AGENT_ACTIONS
to_add_provider: Implement Provider interface in apps/desktop/src/main/services/providers/
to_test_provider: Create fixture in apps/desktop/src/test/fixtures/
cli_binary_locations: /usr/local/bin, /opt/homebrew/bin, ~/.local/bin
-->
