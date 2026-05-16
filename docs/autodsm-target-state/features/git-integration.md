# Git & GitHub Integration

<!-- AGENT_CONTEXT
type: features
scope: git-integration
relates_to:
  - ./core-features.md
  - ../architecture/process-model.md
  - ../architecture/security-model.md
key_services:
  - GitEngine
  - CredentialResolver
trust_rules:
  - Auth passthrough only
  - Branch-per-session
  - Native git binary
  - Native GitHub API
-->

## Quick Reference

| Commitment         | Implementation                 |
| ------------------ | ------------------------------ |
| Auth passthrough   | No long-lived credentials      |
| Branch-per-session | `autodsm/<slug>-<date>-<time>` |
| Native git         | Shell to `git` binary          |
| Native GitHub      | Octokit REST API               |

## Trust Commitments

### 1. Auth Passthrough

No long-lived credentials held by AutoDSM. Every `git push` rides the user's git config; GitHub API calls fetch a token at the moment of use.

### 2. Branch-Per-Session

Every prompt session creates one branch under `autodsm/<slug>-<yyyy-mm-dd>-<hhmm>`. The default branch is **never** edited directly.

### 3. Native Git, Native GitHub

Shell out to `git` (preserves credential helpers, SSH agent, hooks, signing). Call GitHub via `@octokit/rest`. No isomorphic-git, no policy bypass.

## Prompt-to-Merge Flow

```
1. Open Project
   └─► GitEngine.openProject()
       • Validate repo exists
       • Detect remote (origin)
       • Detect default branch
       • Check signing config

2. First Prompt
   └─► GitEngine.createSessionBranch(componentSlug)
       • Branch: autodsm/button-2024-03-15-1430
       • Checkout new branch

3. Agent Edits
   └─► ChangeSet applied to working tree
       • Vite HMR re-renders canvas

4. Click +/- Chip
   └─► DiffSlideOver opens
       • Shows StructuredDiff
       • Per-hunk approve/reject

5. Click "Commit"
   └─► git commit -m "<message>"
       • Pre-commit hooks run
       • GPG signing if configured

6. Click "Open PR"
   └─► git push -u origin <branch>
   └─► Octokit.pulls.create()

7. Polling (every 15s)
   └─► Check runs, reviews, mergeability

8. Click "Merge"
   └─► Octokit.pulls.merge()
   └─► Archive session
   └─► Delete local branch
   └─► Return to default branch
```

## Credential Resolution

### 4-Source Priority

```typescript
async function resolveGitHubToken(): Promise<string> {
  // Priority 1: Environment variable
  if (process.env.AUTODSM_GITHUB_TOKEN) {
    return process.env.AUTODSM_GITHUB_TOKEN;
  }

  // Priority 2: GitHub CLI
  const ghToken = await exec("gh auth token");
  if (ghToken.stdout.trim()) {
    return ghToken.stdout.trim();
  }

  // Priority 3: Git credential helper
  const cred = await gitCredentialFill("https://github.com");
  if (cred?.password) {
    return cred.password;
  }

  // Priority 4: Keychain (device flow only)
  const keychainToken = await keytar.getPassword("autodsm", "github-token");
  if (keychainToken) {
    return keychainToken;
  }

  throw new NoGitHubTokenError();
}
```

### Git Credential Fill

```typescript
async function gitCredentialFill(url: string): Promise<Credential | null> {
  const parsed = new URL(url);
  const input = `protocol=${parsed.protocol.replace(":", "")}\nhost=${parsed.host}\n`;

  const result = await exec("git credential fill", { input });
  if (result.exitCode !== 0) return null;

  const lines = result.stdout.split("\n");
  const cred: Record<string, string> = {};
  for (const line of lines) {
    const [key, value] = line.split("=");
    if (key && value) cred[key] = value;
  }

  return cred as Credential;
}
```

## Branch Management

### Naming Convention

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
  const timestamp = format(new Date(), "yyyy-MM-dd-HHmm");
  const branchName = `autodsm/${componentSlug}-${timestamp}`;

  await exec(`git checkout ${defaultBranch}`);
  await exec(`git pull --ff-only origin ${defaultBranch}`);
  await exec(`git checkout -b ${branchName}`);

  return branchName;
}
```

### Branch Cleanup

```typescript
async function cleanupSessionBranch(branchName: string, deleteRemote: boolean): Promise<void> {
  await exec(`git checkout ${defaultBranch}`);
  await exec(`git branch -D ${branchName}`);

  if (deleteRemote) {
    await exec(`git push origin --delete ${branchName}`);
  }
}
```

## Commit Flow

### Conventional Commit Generation

```typescript
async function generateCommitMessage(changeSet: ChangeSet): Promise<string> {
  const type = inferCommitType(changeSet); // feat, fix, refactor
  const scope = extractScope(changeSet); // component name
  const subject = summarizeChanges(changeSet);

  return `${type}(${scope}): ${subject}`;
}

// Examples:
// feat(button): add rounded corners and hover state
// fix(input): correct focus ring color
// refactor(modal): extract overlay component
```

### Hook Failure Surface

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚠️ Pre-commit hook failed                                        │
├─────────────────────────────────────────────────────────────────┤
│  Hook: lint-staged                                               │
│                                                                  │
│  Error output:                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ src/Button.tsx                                              │ │
│  │   12:5  error  'unused' is defined but never used           │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  [Fix with AI]  [Edit Manually]  [Skip Hook]                    │
└─────────────────────────────────────────────────────────────────┘
```

## Pull Request Flow

### PR Creation

```typescript
async function createPullRequest(options: PROptions): Promise<PR> {
  await exec(`git push -u origin ${currentBranch}`);

  const token = await resolveGitHubToken();
  const octokit = new Octokit({ auth: token });

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

## Why

> make button rounded and use @primary-600

## Commits

- `feat(button): round corners, swap to primary-600` (a3f29c1)

## Tokens referenced

| Token               | Value   | Usage             |
| ------------------- | ------- | ----------------- |
| `color.primary.600` | #2952CC | Button background |
| `radius.md`         | 8px     | Border radius     |

## Scan results

✅ No token drift detected
✅ No accessibility issues

---

_Generated by AutoDSM. The author reviewed and approved this change._
```

## Merge Button State Machine

| State           | Display               | Button   |
| --------------- | --------------------- | -------- |
| checks_pending  | "Waiting for checks…" | Disabled |
| checks_failed   | "Checks failed"       | Disabled |
| needs_approvals | "Needs N approval(s)" | Disabled |
| needs_update    | "Update branch"       | Action   |
| needs_signing   | "Configure signing"   | Link     |
| no_permission   | "Merge in GitHub"     | Link     |
| ready           | "Merge"               | Enabled  |

### State Resolution

```typescript
function resolveMergeState(pr: PullRequest, protection: BranchProtection): MergeState {
  const checksStatus = getChecksStatus(pr.checks);
  if (checksStatus === "pending") return "checks_pending";
  if (checksStatus === "failure") return "checks_failed";

  const approvals = countApprovals(pr.reviews);
  const required = protection.required_approving_review_count ?? 0;
  if (approvals < required) return { type: "needs_approvals", needed: required - approvals };

  if (protection.require_up_to_date && pr.behind_by > 0) return "needs_update";
  if (protection.require_signed_commits && !pr.commits_are_signed) return "needs_signing";
  if (!pr.viewer_can_merge) return "no_permission";

  return "ready";
}
```

## Session Persistence

### Session State

```typescript
interface GitSession {
  id: string;
  projectId: string;
  componentSlug: string;
  branchName: string;
  status: "editing" | "committed" | "pr_open" | "merged" | "archived";
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
  await exec(`git checkout ${session.branchName}`);
  await restoreWorkbenchState(session);

  if (session.status === "pr_open") {
    startPRPolling(session.prNumber);
  }
}
```

## Error Handling

| Error               | Cause               | Resolution                 |
| ------------------- | ------------------- | -------------------------- |
| NoGitHubTokenError  | No token source     | Prompt for `gh auth login` |
| PushRejectedError   | Branch protection   | Show blocking rule         |
| MergeConflictError  | Conflicts with base | Show conflict files        |
| HookFailureError    | Hook failed         | Show hook output           |
| BranchNotFoundError | Remote deleted      | Offer to re-push           |

## Security Rules

- **No token logging** — Never console.log, file, or error report
- **Keychain limit** — At most one entry (`autodsm/github-token`)
- **SSH passthrough** — Git handles SSH agent automatically
- **HTTPS passthrough** — Git uses credential helpers

---

<!-- AGENT_ACTIONS
to_implement_git: Create GitEngine in apps/desktop/src/main/services/
to_implement_credentials: Create CredentialResolver in apps/desktop/src/main/services/
to_test_git_flow: Test with SSH remote + gh, HTTPS + osxkeychain, device flow
branch_naming: autodsm/<component-slug>-<yyyy-mm-dd>-<hhmm>
-->
