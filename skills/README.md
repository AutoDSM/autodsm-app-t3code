# Skills — Agent Instruction Library

This directory contains **agent-facing instruction assets** for working on the
AutoDSM-on-T3Code application. These are not generic docs: they are decision
guides, contracts, and visual references that a coding agent should load
_before_ making non-trivial changes in this repo.

> **Source of truth:** the code, schemas, and `docs/autodsm-target-state/` are
> authoritative. The files here are _operational_ — they tell agents how to
> behave when touching specific subsystems.

---

## How to choose and combine skills

Pick skills by the **shape of the task**, not the file you happen to be editing.

| If the task involves...                                          | Mandatory reads (in order)                                                                                                                                                                                           |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Anything that renders a user component**                       | [`rendering/webcontentsview-renderer.md`](./rendering/webcontentsview-renderer.md), [`rendering/safe-runtime.md`](./rendering/safe-runtime.md), [`architecture/security-model.md`](./architecture/security-model.md) |
| **Writing to the user's repo**                                   | [`changeset/changeset-lifecycle.md`](./changeset/changeset-lifecycle.md), [`changeset/branch-per-session.md`](./changeset/branch-per-session.md), [`workflow/pr-conventions.md`](./workflow/pr-conventions.md)       |
| **A new typed payload across processes**                         | [`architecture/rpc-and-contracts.md`](./architecture/rpc-and-contracts.md), [`architecture/artifact-contracts.md`](./architecture/artifact-contracts.md)                                                             |
| **Wiring a provider (Claude / Codex / OpenCode / Cursor)**       | [`agent/provider-driver-integration.md`](./agent/provider-driver-integration.md), [`agent/agent-context-assembly.md`](./agent/agent-context-assembly.md), [`agent/prompt-budget.md`](./agent/prompt-budget.md)       |
| **Anything user-facing or pricing-shaped (free/pro/team/ent.)**  | [`product/autodsm-product-strategy.md`](./product/autodsm-product-strategy.md), [`product/autodsm-glossary.md`](./product/autodsm-glossary.md)                                                                       |
| **A new artifact or scan rule**                                  | [`architecture/artifact-contracts.md`](./architecture/artifact-contracts.md), [`scan/scanner.md`](./scan/scanner.md), [`scan/drift-detection.md`](./scan/drift-detection.md)                                         |
| **Detecting a project's framework/style stack**                  | [`rendering/render-environment-profile.md`](./rendering/render-environment-profile.md), [`rendering/provider-packs.md`](./rendering/provider-packs.md)                                                               |
| **Electron main process, windows, views, IPC, sessions, or CSP** | [`electron/README.md`](./electron/README.md), [`electron/official-docs-index.md`](./electron/official-docs-index.md), then the focused Electron file for the touched API                                             |
| **Tests, CI, or release plumbing**                               | [`workflow/testing.md`](./workflow/testing.md), [`workflow/coding-conventions.md`](./workflow/coding-conventions.md), [`ops/observability.md`](./ops/observability.md)                                               |
| **Remote / SSH / Tailscale access**                              | [`ops/remote-and-ssh.md`](./ops/remote-and-ssh.md), [`architecture/security-model.md`](./architecture/security-model.md)                                                                                             |

If a task touches _multiple_ of these areas, read the **security model** and the
**ChangeSet lifecycle** first — they constrain everything else.

---

## Mandatory reads by topic

These files describe load-bearing invariants. If you make a change that touches
them and you have not read them, you are guessing.

- **Preview / rendering** → [`rendering/webcontentsview-renderer.md`](./rendering/webcontentsview-renderer.md). The preview is a sibling `WebContentsView` under a `BaseWindow`, **not** an iframe in the UI renderer. Treat this as a hard rule.
- **ChangeSet** → [`changeset/changeset-lifecycle.md`](./changeset/changeset-lifecycle.md). All writes to the user repo go through ChangeSets. No raw `fs.writeFile` on user paths from feature code.
- **Contracts** → [`architecture/rpc-and-contracts.md`](./architecture/rpc-and-contracts.md). Cross-process payloads start in `packages/contracts` with `effect/Schema`. No untyped IPC. No domain logic in `packages/contracts`.
- **Electron runtime** → [`electron/README.md`](./electron/README.md) and [`electron/official-docs-index.md`](./electron/official-docs-index.md). Any task touching Electron `main`, `BaseWindow`, `BrowserWindow`, `WebContentsView`, `webContents`, sessions, preload scripts, IPC, navigation, CSP, permissions, or preview security must load the relevant Electron skill first and verify API-sensitive choices against the official Electron docs.
- **Provider integration** → [`agent/provider-driver-integration.md`](./agent/provider-driver-integration.md). Provider tools never write to disk directly. They emit `ChangeSet` proposals.
- **Product scoping** → [`product/autodsm-product-strategy.md`](./product/autodsm-product-strategy.md). When unsure whether something is in scope, run it through the in/out/defer rubric.

---

## Visual references

`.html` files are self-contained (inline CSS/SVG, no external assets). Open
locally; do not depend on a network.

- [`product/autodsm-product-strategy.html`](./product/autodsm-product-strategy.html) — product loop, artifacts, and pricing tiers.
- [`architecture/process-model.html`](./architecture/process-model.html) — main/renderer/preview/server/worker/sidecar topology.
- [`rendering/webcontentsview-renderer.html`](./rendering/webcontentsview-renderer.html) — `BaseWindow` + child `WebContentsView` diagram with IPC channels.
- [`electron/process-model.html`](./electron/process-model.html) — official Electron process boundaries mapped to AutoDSM's UI view, preview view, local server, sidecar Vite runtime, and worker pool.
- [`electron/webcontentsview.html`](./electron/webcontentsview.html) — `BaseWindow.contentView` with sibling UI and preview `WebContentsView`s, bounds flow, `loadURL` flow, and security gates.

---

## Conventions for this directory

- Each `.md` is **practical and short**: rules, checklists, code-shape examples — not essays.
- Prefer linking to source files over restating their content.
- When an instruction here contradicts the code, **fix the code or fix the doc** in the same PR. Stale rules are worse than no rules.
- New skills land in the matching subdirectory and are indexed from this README.
