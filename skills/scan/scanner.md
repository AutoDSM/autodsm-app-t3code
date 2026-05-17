# Scanner

> Load this skill when adding a new scan rule, changing severities, integrating
> axe-core, or surfacing autofix hints.

The scanner runs as a **worker** off the main thread. It emits `ScanArtifact`
values keyed on `(rule version + file content hash + ruleset version)`. The UI,
agent supervisor, and governance gates consume the artifact — they do not
re-run rules.

## What the scanner does

For each component (or selected scope), the scanner runs:

1. **AST rules** — TypeScript-aware rules that inspect the component source
   (e.g., "Button must accept `aria-label` when no children"; "do not import
   from `lib/legacy/*`").
2. **Brand drift rules** — color/typography/spacing literals not present in
   `BrandProfile`. See [`drift-detection.md`](./drift-detection.md).
3. **Usage drift rules** — components reimplementing patterns already in the
   registry (a "local copy" of `Button` in a feature folder).
4. **a11y rules** — axe-core against the latest `RenderManifest` DOM snapshot.
5. **Project-defined rules** — `.autodsm/rules/*.ts` loaded in a sandboxed
   worker.

## Rule shape

```ts
interface Rule {
  id: string; // stable, dotted
  version: string; // bump on behavior change
  severity: "info" | "warn" | "error";
  applies: (ctx: RuleContext) => boolean;
  run: (ctx: RuleContext) => Violation[];
}

interface Violation {
  ruleId: string;
  severity: "info" | "warn" | "error";
  location: { file: string; range: { start: number; end: number } };
  message: string;
  autofix?: AutofixHint; // optional; never auto-applied
}
```

- IDs are dotted (`a11y.button.requires-aria-label`).
- Bumping a rule's `version` invalidates cached artifacts for that rule.
- A rule with a flaky output should be marked unstable, not lowered to `info`.

## Severities

| Severity | Meaning                                                     | UI treatment                              |
| -------- | ----------------------------------------------------------- | ----------------------------------------- |
| `info`   | Useful signal; not a problem on its own.                    | Dim; collapsed by default.                |
| `warn`   | Likely problem; should be reviewed.                         | Visible; non-blocking.                    |
| `error`  | Hard violation; team-tier governance gates may block on it. | Prominent; can block merge if configured. |

Severity is a property of the rule, not the project. Projects can _escalate_
or _demote_ via `.autodsm/rules.json`; the artifact records both the original
and the effective severity.

## Autofix hints

An autofix hint proposes a fix in `ChangeOp` form. **Hints are never auto-applied.**
The user, or the agent on the user's behalf, decides:

- The scanner emits the hint into the violation.
- The agent supervisor may propose to apply it (turning it into a
  `ChangeSetProposal`).
- The user accepts/rejects through DiffPanel.

This keeps writes mediated by the ChangeSet lifecycle.

## Worker boundary

- Scanner code lives in a worker; never imports renderer or main singletons.
- Inputs: typed slices (`ComponentRegistry`, `BrandProfile`,
  `RenderEnvironmentProfile`, optional `RenderManifest`).
- Outputs: typed `ScanArtifact`.
- Cache: keyed by `(ruleId@version, contentHash, ruleset@version)`. Cache writes
  are content-addressed on disk.

## Performance

- Run rules concurrently with bounded parallelism (CPU count − 1).
- Bail early on syntactic errors at parse time; surface as a single `error`
  violation rather than spamming every downstream rule.
- The scanner exposes `runIncremental(delta)` for editor-fast updates;
  full-project `run()` for governance.

## Anti-patterns

- ❌ Running scans on the main thread.
- ❌ Mutating the scanner's input slices.
- ❌ Embedding axe-core results without recording the axe ruleset version
  (cache invalidation will be wrong).
- ❌ Defining rule severity per-project at the rule file level — let projects
  escalate/demote via config.

## See also

- [`drift-detection.md`](./drift-detection.md) — brand and usage drift rules.
- [`architecture/artifact-contracts.md`](../architecture/artifact-contracts.md)
  — `ScanArtifact` contract.
