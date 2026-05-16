# AutoDSM — Git & GitHub Integration

## Trust Commitments

### 1. Auth Passthrough
No long-lived credentials held by AutoDSM. Every `git push` rides the user's git config; GitHub API calls fetch a token at the moment of use.

### 2. Branch-Per-Session
Every prompt session creates one branch under `autodsm/<slug>-<yyyy-mm-dd>-<hhmm>`. The default branch is **never** edited directly.

### 3. Native Git, Native GitHub
Shell out to `git` (preserves credential helpers, SSH agent, hooks, signing). Call GitHub via `@octokit/rest`. No isomorphic-git, no scraping, no policy bypass.

---

## The Full Prompt-to-Merge Loop

```
┌─────────────────────────────────────────────────────────────────┐
│                    PROMPT TO MERGE FLOW                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Open Project                                                 │
│     └─► GitEngine.openProject()                                 │
│         • Validate repo exists                                   │
│         • Detect remote (origin)                                │
│         • Detect default branch (main/master)                   │
│         • Check signing config                                   │
│                                                                  │
│  2. First Prompt                                                 │
│     └─► GitEngine.createSessionBranch(componentSlug)            │
│         • Branch: autodsm/button-2024-03-15-1430                │
│         • Checkout new branch                                    │
│         • Track remote: origin/autodsm/...                      │
│                                                                  │
│  3. Agent Edits                                                  │
│     └─► ChangeSet applied to working tree                       │
│         • Vite HMR re-renders canvas live                       │
│                                                                  │
│  4. Click +/- Chip                                               │
│     └─► DiffSlideOver opens                                     │
│         • Shows StructuredDiff                                   │
│         • Per-hunk approve/reject                               │
│                                                                  │
│  5. Click "Commit"                                               │
│     └─► Agent generates conventional commit message             │
│         • User can edit message                                  │
│         • git commit -m "<message>"                             │
│         • Pre-commit hooks run (husky, lint-staged)             │
│         • GPG signing if configured                             │
│                                                                  │
│  6. Click "Open PR"                                              │
│     └─► git push -u origin <branch>                             │
│         • Uses user's SSH/HTTPS credentials                     │
│     └─► CredentialResolver.getToken()                           │
│     └─► Octokit.pulls.create({                                  │
│           owner, repo, title, body, head, base                  │
│         })                                                       │
│                                                                  │
│  7. Polling (while PR view focused)                              │
│     └─► Every 15s:                                              │
│         • Check runs status                                      │
│         • Review status                                          │
│         • Mergeability status                                    │
│                                                                  │
│  8. Click "Merge"                                                │
│     └─► Octokit.pulls.merge({                                   │
│           pull_number, sha, merge_method                        │
│         })                                                       │
│     └─► On success:                                             │
│         • Archive session                                        │
│         • Delete local branch                                    │
│         • Optionally delete remote branch                       │
│         • Return to default branch                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Credential Resolution

### 4-Source Priority

```typescript
async function resolveGitHubToken(): Promise<string> {
  // Priority 1: Environment variable (power-user override)
  if (process.env.AUTODSM_GITHUB_TOKEN) {
    return process.env.AUTODSM_GITHUB_TOKEN;
  }

  // Priority 2: GitHub CLI (preferred for most users)
  const ghToken = await exec('gh auth token');
  if (ghToken.stdout.trim()) {
    return ghToken.stdout.trim();
  }

  // Priority 3: Git credential helper (HTTPS)
  const cred = await gitCredentialFill('https://github.com');
  if (cred?.password) {
    return cred.password;
  }

  // Priority 4: Keychain (device flow only)
  const keychainToken = await keytar.getPassword('autodsm', 'github-token');
  if (keychainToken) {
    return keychainToken;
  }

  // No token available - prompt user
  throw new NoGitHubTokenError();
}
```

### Git Credential Fill

```typescript
async function gitCredentialFill(url: string): Promise<Credential | null> {
  const parsed = new URL(url);
  const input = `protocol=${parsed.protocol.replace(':', '')}\nhost=${parsed.host}\n`;

  const result = await exec('git credential fill', { input });
  if (result.exitCode !== 0) return null;

  const lines = result.stdout.split('\n');
  const cred: Record<string, string> = {};
  for (const line of lines) {
    const [key, value] = line.split('=');
    if (key && value) cred[key] = value;
  }

  return cred as Credential;
}
```

---

## Branch Management

### Session Branch Naming

```
autodsm/<component-slug>-<yyyy-mm-dd>-<hhmm>

Examples:
- autodsm/button-2024-03-15-1430
- autodsm/input-field-2024-03-15-1445
- autodsm/modal-dialog-2024-03-16-0900
```

### Branch Creation

```typescript
async function createSessionBranch(componentSlug: string): Promise<string> {
  const timestamp = format(new Date(), 'yyyy-MM-dd-HHmm');
  const branchName = `autodsm/${componentSlug}-${timestamp}`;

  // Ensure we're on the default branch
  await exec(`git checkout ${defaultBranch}`);

  // Pull latest
  await exec(`git pull --ff-only origin ${defaultBranch}`);

  // Create and checkout new branch
  await exec(`git checkout -b ${branchName}`);

  return branchName;
}
```

### Branch Cleanup

```typescript
async function cleanupSessionBranch(
  branchName: string,
  deleteRemote: boolean
): Promise<void> {
  // Return to default branch
  await exec(`git checkout ${defaultBranch}`);

  // Delete local branch
  await exec(`git branch -D ${branchName}`);

  // Optionally delete remote branch
  if (deleteRemote) {
    await exec(`git push origin --delete ${branchName}`);
  }
}
```

---

## Commit Flow

### Conventional Commit Generation

```typescript
async function generateCommitMessage(changeSet: ChangeSet): Promise<string> {
  const type = inferCommitType(changeSet);  // feat, fix, refactor, etc.
  const scope = extractScope(changeSet);     // component name
  const subject = summarizeChanges(changeSet);

  return `${type}(${scope}): ${subject}`;
}

// Examples:
// feat(button): add rounded corners and hover state
// fix(input): correct focus ring color
// refactor(modal): extract overlay component
```

### Hook Execution

```typescript
async function commit(message: string): Promise<CommitResult> {
  try {
    // Git commit runs all configured hooks
    const result = await exec(`git commit -m "${escapeMessage(message)}"`);
    return { success: true, sha: extractSha(result.stdout) };
  } catch (error) {
    if (isHookFailure(error)) {
      return {
        success: false,
        hookName: extractHookName(error),
        stderr: error.stderr,
      };
    }
    throw error;
  }
}
```

### Hook Failure Surface

When a pre-commit hook fails:

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚠️ Pre-commit hook failed                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Hook: lint-staged                                               │
│                                                                  │
│  Error output:                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ src/Button.tsx                                              │ │
│  │   12:5  error  'unused' is defined but never used  no-unused│ │
│  │                                                             │ │
│  │ ✖ 1 problem (1 error, 0 warnings)                          │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  [Fix with AI]  [Edit Manually]  [Skip Hook (not recommended)]  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Pull Request Flow

### PR Creation

```typescript
async function createPullRequest(options: PROptions): Promise<PR> {
  // Push branch to remote
  await exec(`git push -u origin ${currentBranch}`);

  // Get GitHub token
  const token = await resolveGitHubToken();
  const octokit = new Octokit({ auth: token });

  // Create PR
  const { data: pr } = await octokit.pulls.create({
    owner: options.owner,
    repo: options.repo,
    title: options.title,
    body: options.body,
    head: currentBranch,
    base: defaultBranch,
  });

  return pr;
}
```

### Auto-Generated PR Body

```markdown
## What changed
- `src/components/Button.tsx` (modified)
- `src/components/Button.module.css` (modified)

## Why
> make button rounded and use @primary-600
> also bump the size lg to be 48px

## Commits
- `feat(button): round corners, swap to primary-600` (a3f29c1)
- `feat(button): bump lg size to 48px` (b1c44de)

## Tokens referenced
| Token | Value | Usage |
|-------|-------|-------|
| `color.primary.600` | #2952CC | Button background |
| `spacing.lg` | 48px | Button height |
| `radius.md` | 8px | Border radius |

## Scan results
✅ No token drift detected
✅ No accessibility issues
✅ No provider drift

---
*Generated by AutoDSM. The author reviewed and approved this change before opening this PR.*
```

---

## Merge Button State Machine

```
┌─────────────────────────────────────────────────────────────────┐
│                    MERGE BUTTON STATES                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  State: checks_pending                                           │
│  ───────────────────                                            │
│  Display: "Waiting for checks…"                                  │
│  Button: Disabled                                                │
│  Reason: CI checks are still running                             │
│                                                                  │
│  State: checks_failed                                            │
│  ──────────────────                                             │
│  Display: "Checks failed"                                        │
│  Button: Disabled                                                │
│  Reason: One or more required checks failed                      │
│                                                                  │
│  State: needs_approvals                                          │
│  ─────────────────────                                          │
│  Display: "Needs N approval(s)"                                  │
│  Button: Disabled                                                │
│  Reason: Branch protection requires more reviews                 │
│                                                                  │
│  State: needs_update                                             │
│  ──────────────────                                             │
│  Display: "Update branch"                                        │
│  Button: Action (updates branch)                                 │
│  Reason: Branch is behind base and requireUpToDate is set        │
│                                                                  │
│  State: needs_signing                                            │
│  ───────────────────                                            │
│  Display: "Configure signing"                                    │
│  Button: Link to docs                                            │
│  Reason: Commits must be signed but aren't                       │
│                                                                  │
│  State: no_permission                                            │
│  ───────────────────                                            │
│  Display: "Merge in GitHub"                                      │
│  Button: Link to PR                                              │
│  Reason: User lacks merge permission                             │
│                                                                  │
│  State: ready                                                    │
│  ────────────                                                   │
│  Display: "Merge"                                                │
│  Button: Enabled (green)                                         │
│  Reason: All requirements met                                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### State Resolution

```typescript
function resolveMergeState(pr: PullRequest, protection: BranchProtection): MergeState {
  // Check CI status
  const checksStatus = getChecksStatus(pr.checks);
  if (checksStatus === 'pending') return 'checks_pending';
  if (checksStatus === 'failure') return 'checks_failed';

  // Check approvals
  const approvals = countApprovals(pr.reviews);
  const required = protection.required_approving_review_count ?? 0;
  if (approvals < required) return { type: 'needs_approvals', needed: required - approvals };

  // Check up-to-date requirement
  if (protection.require_up_to_date && pr.behind_by > 0) {
    return 'needs_update';
  }

  // Check signing requirement
  if (protection.require_signed_commits && !pr.commits_are_signed) {
    return 'needs_signing';
  }

  // Check merge permission
  if (!pr.viewer_can_merge) return 'no_permission';

  return 'ready';
}
```

---

## Session Persistence

### Session State

```typescript
interface GitSession {
  id: string;
  projectId: string;
  componentSlug: string;
  branchName: string;
  status: 'editing' | 'committed' | 'pr_open' | 'merged' | 'archived';
  commits: CommitSummary[];
  prNumber?: number;
  prUrl?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Resume on App Restart

```typescript
async function resumeSession(sessionId: string): Promise<void> {
  const session = await loadSession(sessionId);

  // Restore branch
  await exec(`git checkout ${session.branchName}`);

  // Restore UI state
  await restoreWorkbenchState(session);

  // Resume polling if PR is open
  if (session.status === 'pr_open') {
    startPRPolling(session.prNumber);
  }
}
```

---

## Security Considerations

### No Token Logging

```typescript
// NEVER do this
console.log(`Token: ${token}`);  // ❌

// Instead
console.log('Token resolved successfully');  // ✓
```

### Keychain Entry

Only one Keychain entry is ever created:

- **Service:** `autodsm`
- **Account:** `github-token`
- **Created by:** Device-flow OAuth only

### SSH vs HTTPS

AutoDSM respects the user's git configuration:

```typescript
// Detect remote type
const remoteUrl = await exec('git remote get-url origin');
const isSSH = remoteUrl.startsWith('git@') || remoteUrl.includes('ssh://');

// Push uses native git (SSH or HTTPS)
await exec('git push -u origin ' + branchName);
// Git handles SSH agent or credential helper automatically
```

---

## Error Handling

### Common Errors

| Error | Cause | Resolution |
|-------|-------|------------|
| `NoGitHubTokenError` | No token source available | Prompt for `gh auth login` or device flow |
| `PushRejectedError` | Branch protection violation | Show specific protection rule that blocked |
| `MergeConflictError` | Conflicts with base branch | Show conflict files, offer resolution UI |
| `HookFailureError` | Pre-commit/pre-push hook failed | Show hook output, offer fix options |
| `BranchNotFoundError` | Remote branch deleted | Offer to re-push |

### Recovery Flows

```typescript
// Hook failure recovery
if (error instanceof HookFailureError) {
  const action = await showHookFailureDialog(error);
  switch (action) {
    case 'fix':
      await runAgentFix(error.lintErrors);
      break;
    case 'skip':
      await exec('git commit --no-verify -m "..."');
      break;
    case 'edit':
      await openInEditor(error.files);
      break;
  }
}
```
