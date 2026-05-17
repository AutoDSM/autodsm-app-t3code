# Drift Detection (Brand & Component Usage)

> Use this skill when changing how AutoDSM detects "things that drifted from
> the source of truth" — design tokens hard-coded into components, or local
> reinventions of registry components.

## Brand drift

A component shows **brand drift** when it uses a token-shaped value that is
_not_ the canonical token in `BrandProfile`:

- Hex colors / rgb() / hsl() literals that don't map to a Brand token (with
  small tolerance for off-by-one rounding).
- Font families/sizes/weights not in Brand typography.
- Spacing values outside the Brand spacing scale.
- Radii/shadows not in Brand effects.

### Detection

The rule walks the component AST + computed styles from the latest
`RenderManifest`. Literals are normalized (lowercased, parsed as numbers) and
matched against the Brand profile's token table.

- **Match by value, not by name.** A token named `--primary` could be referred
  to by hex anywhere; we match the value.
- **Tolerance.** Color delta ≤ ΔE 1.0 is treated as a match (off-by-one).
- **Exemptions.** A component may carry an `// autodsm-brand-exempt: <reason>`
  comment on the line; the violation moves to `info` with the reason recorded.

### Output

Violations have `ruleId: 'brand.drift.<dimension>'` where `<dimension>` is one
of `color | typography | spacing | radius | shadow`. Autofix hints propose
swapping the literal for the canonical token reference (Tailwind class, CSS
var, theme token — whichever the project uses).

## Component usage drift

A component reinventing a registered component is **usage drift**:

- A local `Button` defined inside a feature folder when `ComponentRegistry`
  already has one.
- Two components with structurally similar prop shapes and behavior.

### Detection

- Structural signature: hash of the component's exported symbol name +
  normalized prop schema + JSX root shape.
- Registry candidates: top-N (default 5) registry entries with the same or
  similar signatures.
- Confidence score derived from signature overlap + name similarity.

The rule does not flag every duplicate — only those above the configured
confidence threshold (default 0.75). Below threshold, an `info` is emitted for
visibility.

### Output

Violations carry `ruleId: 'usage.drift.local-reimplementation'` with the
suspected canonical component id, the local component id, and the confidence
score. Autofix hint proposes:

- Importing the canonical component.
- Migrating local prop names to canonical ones.
- Removing the local file.

Hints with prop mismatches are emitted as `warn`, not autofixable, with a
human-readable description of the mismatch.

## Dashboards (Team tier)

Drift artifacts feed two dashboards (Team tier):

- **Brand drift map** — heatmap of which Brand dimensions have the most drift,
  by team/squad if folder ownership is configured.
- **Reimplementation report** — list of local components shadowing registry
  components, with confidence.

Free/Pro see the same violations inline; the dashboards aggregate at scale.

## Anti-patterns

- ❌ Flagging _all_ hex literals as drift. Match against Brand, with tolerance.
- ❌ Using regex on source instead of AST + computed styles.
- ❌ Comparing component prop schemas by JSON.stringify (key order matters).
- ❌ Emitting `error` severity for usage drift without a project setting.

## See also

- [`scanner.md`](./scanner.md) — rule shape, severities, autofix hints.
- [`product/autodsm-glossary.md`](../product/autodsm-glossary.md) —
  BrandProfile, ComponentRegistry.
