# Prompt Budget

> Use this skill when changing slice sizes, summarization strategy, intent
> classification, or any prompt-shaping logic. Keep prompts useful, _not_
> maximally long.

## Why a budget

- Provider tokens cost money and time.
- Past a point, more context degrades quality (model attention scatters).
- Cache hits are easier if prompt shape and order are stable; budgets enforce
  stability.

## Per-slice token caps (defaults)

These are guides, not religious limits. The supervisor enforces them via the
slice-specific summarizer.

| Slice               | Soft cap (tokens) | Hard cap  | Truncation strategy                                    |
| ------------------- | ----------------- | --------- | ------------------------------------------------------ |
| System              | 1.5k              | 2k        | Owned by the supervisor; rarely changes.               |
| Environment         | 0.5k              | 1k        | Drop optional fields; keep framework+style+pack list.  |
| Brand slice         | 1k                | 2k        | Keep only tokens referenced by the selected component. |
| Component slice     | 4k                | 8k        | Source + prop schema; trim comments before code.       |
| Usage map           | 1k                | 2k        | Top-N callers; collapse to one-line call signatures.   |
| Recent EditOutcomes | 0.5k              | 1k        | Bullet summaries.                                      |
| Scan slice          | 1k                | 2k        | Group by ruleId; one example per group.                |
| Render slice        | 0.5k              | 1k        | Errors + warnings only by default.                     |
| User intent         | 1k                | 2k        | Verbatim; refuse to truncate.                          |
| **Total target**    | **≤ 16k**         | **≤ 24k** |                                                        |

Above the hard cap, the supervisor returns an error to the caller before
sending — never a silent truncation of user intent.

## Intent classification

A small classifier picks an _intent_ for the turn:

- `tweak` — small visual/prop change to one component.
- `restructure` — non-trivial refactor or API change.
- `add-component` — net-new component.
- `fix-violation` — react to a scan violation.
- `explain` — read-only Q&A (no ChangeSet expected).

Each intent has its own slice profile (e.g., `explain` drops the Brand slice;
`add-component` expands the Brand slice and shrinks the Usage map).

The classifier runs _before_ slice assembly and is cheap (local; no
provider call). When unsure, default to `tweak`.

## Summarization rules of thumb

- Summarize **deterministically** — same input ⇒ same output. Helps caching.
- Summarize at the **slice helper level**, not in the supervisor.
- Prefer dropping the **lowest-value tail** (e.g., 9th-N usage call site)
  over rewriting content.
- Never paraphrase the user's intent.

## Sections that must be in every prompt

- A short system header identifying AutoDSM and the available tools.
- The user intent.
- At least the component slice and environment slice (otherwise the agent has
  no idea what stack it's working in).

## Anti-patterns

- ❌ Bumping caps "to be safe."
- ❌ Inlining summarization logic in the supervisor or driver.
- ❌ Letting one slice eat the whole budget and silently dropping the rest.
- ❌ Stuffing the user message with auto-context (it's the _user's_ message).
- ❌ Different ordering per provider (breaks cross-provider parity tests).

## See also

- [`agent-context-assembly.md`](./agent-context-assembly.md)
- [`provider-driver-integration.md`](./provider-driver-integration.md)
