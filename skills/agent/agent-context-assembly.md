# Agent Context Assembly

> Use this skill when changing what the agent "sees" before it proposes a
> change. The goal is to give the agent enough system-level context to be
> useful, without flooding the prompt window with stuff that doesn't move the
> outcome.

## Sources of context

The supervisor assembles a `GenerationPlan` prompt from the following slices.
Each slice has a budget and a summarization fallback (see
[`prompt-budget.md`](./prompt-budget.md)).

| Slice                   | Source                              | Default budget                                |
| ----------------------- | ----------------------------------- | --------------------------------------------- |
| **Selected component**  | `ComponentRegistry` (focused entry) | Full prop schema, current source              |
| **Usage map**           | `ComponentRegistry` (callers)       | Top-N call sites (default 8)                  |
| **Brand slice**         | `BrandProfile`                      | Tokens referenced by the selected component   |
| **Render slice**        | latest `RenderManifest`             | Errors + warnings only by default             |
| **Scan slice**          | latest `ScanArtifact`               | Violations on this component + immediate deps |
| **Environment slice**   | `RenderEnvironmentProfile`          | Framework + style system + active packs       |
| **User intent**         | The user's message                  | Verbatim                                      |
| **Recent EditOutcomes** | Last ≤3 outcomes on this component  | One-line summaries                            |

Slices are **typed**: each maps to a section in the prompt with a stable
header so providers can rely on the structure.

## Order

Order matters for both attention and cache hits.

1. **System** — provider-stable system header (rarely changes; cacheable).
2. **Environment slice** — second-most stable.
3. **Brand slice** — stable across many turns.
4. **Component slice** — selected component source + prop schema.
5. **Usage map** — top callers.
6. **Recent EditOutcomes** — short, ordered oldest → newest.
7. **Render + scan slices** — current state.
8. **User intent** — last.

Stable slices live earlier to maximize provider-side prompt caching.

## Summarization rules

- If a slice exceeds its budget, summarize **deterministically**:
  - Component source: top-of-file imports + exported symbols + jsdoc;
    full body only for the selected component.
  - Usage map: collapse to `path:line — call signature` lines.
  - Scan: group by ruleId, severity counts + one example.
  - Render: keep only errors and warnings.
- Summarization is implemented in one helper per slice. Do not summarize
  ad-hoc inside the supervisor.
- A user _explicit_ request ("show me the full file") expands the slice for
  that turn only.

## What NOT to include

- ❌ `node_modules` sources, even of dependencies the component imports.
- ❌ Whole-repo file trees. Use targeted slices.
- ❌ Telemetry, secrets, or anything from a non-allowlisted env var.
- ❌ Sample data, fixtures, or test bodies unless directly relevant.
- ❌ Multiple file copies because "the agent might want them" — let it ask via
  a tool call instead.

## Tool calls vs context

Prefer to **expose tools** for on-demand retrieval over pre-loading context:

- `readFile(path, range)` — bounded, validated against project root.
- `searchSymbol(name)` — backed by the indexer.
- `getUsageMap(componentId, opts)` — paginated callers.
- `runScan(componentId)` — produces a fresh scan slice.

Tools mean the prompt doesn't need to predict what the agent will need. The
_context_ is the registry skeleton + intent; the _details_ arrive via tools.

## Provider-agnostic shape

The assembled prompt is provider-agnostic. The provider-driver layer (see
[`provider-driver-integration.md`](./provider-driver-integration.md)) maps it
to each provider's expected wire format.

## Anti-patterns

- ❌ Reading the entire `ComponentRegistry` into the prompt.
- ❌ Including the full `ScanArtifact` when only this component's violations
  matter.
- ❌ Sending pre-decoded provider-specific tool definitions in the
  provider-agnostic prompt.
- ❌ Letting each slice format itself differently per turn (breaks caching).

## See also

- [`prompt-budget.md`](./prompt-budget.md) — caps and how to enforce them.
- [`provider-driver-integration.md`](./provider-driver-integration.md) — wire mapping.
