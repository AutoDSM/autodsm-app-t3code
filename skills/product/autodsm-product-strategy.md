# AutoDSM Product Strategy

> Use this skill when a change has product-shape: pricing, packaging, scope
> calls, ICP fit, naming, or "should this be a feature?" questions.

## One-line positioning

**A local-first AI workspace for editing, governing, and shipping real
React component systems** — Cursor's agentic loop + Storybook's component
browser + Mintlify's published-docs polish, fused into one desktop app.

## The core loop (memorize this)

```
SELECT COMPONENT
    → REQUEST CHANGE (prompt)
    → PREVIEW RENDER (sibling WebContentsView)
    → REVIEW DIFF (DiffPanel on ChangeSet)
    → VALIDATE AGAINST SCAN
    → MERGE SAFELY (branch-per-session, user's git, user's PR)
```

Every loop iteration is mediated by **artifacts** (see
[autodsm-glossary.md](./autodsm-glossary.md)). No artifact, no feature.

## Why this exists (problem framing)

- Shared React component systems calcify: too risky to change, drift everywhere.
- Generic AI tools edit components without system-level context: unsafe.
- Storybook and friends _describe_ a system but don't _change_ it.
- Design tools generate new UI but ignore the shared library that already ships.

AutoDSM closes the loop: **edit existing shared components in the real repo,
with system-level context, mediated by ChangeSets the user merges.**

## Tier boundaries (free / pro / team / enterprise)

Use these to triage feature requests. If a request crosses a line, surface it.

| Tier           | Price       | Who it's for                    | What's in                                                                                | What's NOT in                          |
| -------------- | ----------- | ------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------- |
| **Free**       | $0          | Solo engineers, OSS, evaluation | Local edits, single-repo, single-provider, basic scan, local preview                     | Team governance, SSO, audit, on-prem   |
| **Pro**        | $29/mo      | Power individuals, freelancers  | All providers, all scan rules, brand drift, multiple projects, publish snapshots locally | Shared brand books, seat management    |
| **Team**       | $49/seat/mo | Shared component libraries      | Pro + shared BrandProfile, governance gates, violations dashboards, seat roles           | SSO, audit logs, on-prem, custom packs |
| **Enterprise** | $40–80K/yr  | Compliance-heavy orgs           | Team + SSO, audit, on-prem deploy, custom provider packs, support SLAs                   | —                                      |

## In / Out / Defer rubric

Run new features through this filter. **In** = build now. **Out** = will never
build (anti-ICP). **Defer** = good idea, wrong phase.

### In

- Reads or writes one of the [seven canonical artifacts](./autodsm-glossary.md).
- Strengthens the prompt → preview → diff → merge loop.
- Keeps source code on the user's machine.
- Improves render fidelity, scan accuracy, or ChangeSet safety.
- Works on a _real_ shared React library (not a toy app).

### Out

- Design-only workflows with no code (we're not Figma).
- Cloud-hosted edits to the user's source.
- Publishing flows that aren't downstream of a code change.
- General-purpose IDE features unrelated to component systems.
- "Generate a whole app from a prompt" — anti-ICP.

### Defer

- Storybook _import_ (later: Phase 3+).
- Mobile/RN component packs (later: post-v1).
- Non-React component systems (later).
- Org-wide governance dashboards (Team tier, post-MVP).
- Inline AI suggestions inside the editor (we're not a code editor).

## Architectural principles tied to strategy

- **Local-first is non-negotiable.** Source never leaves the machine unless the
  user explicitly publishes a `PublishedSnapshot`. No secrets to AutoDSM servers.
- **Artifact-driven.** Every feature maps to an artifact ownership and an
  invalidation key. See [artifact-contracts.md](../architecture/artifact-contracts.md).
- **Merge-safe.** Every write is a ChangeSet. Every commit is the user's commit.
  Every merge is the user's merge. Branch-per-session always.
- **T3Code is the shell/spine.** Electron runtime, local server, typed contracts,
  provider drivers, git workflow, settings/keychain, DiffPanel. Reusable
  AutoDSM pieces (project analysis, indexer, render runtime, provider packs,
  schemas, workbench UI) port in as domain services on top of the shell.

## Differentiators (use in scoping conversations)

| vs.                 | AutoDSM's edge                                                   |
| ------------------- | ---------------------------------------------------------------- |
| Storybook           | No `.stories` required, AI edit loop, real-repo fidelity.        |
| Chromatic           | Generates changes, not just detects them.                        |
| Zeroheight/Mintlify | Docs are downstream output, not the product.                     |
| Cursor / Copilot    | System-level component context, ChangeSet-validated, merge-safe. |
| Knapsack            | Local-first trust, broader ICP, free tier.                       |
| Anima / v0          | Edits _existing_ shared components in the real repo.             |

## Visual

See [autodsm-product-strategy.html](./autodsm-product-strategy.html) for the
one-page product loop with artifacts mapped to services.

## When in doubt

If a proposed change does not fit cleanly into the in/out/defer rubric, **stop
and ask for product input** before writing code. Most ambiguous features map to
_defer_, not _in_.
