import type { ComponentPreviewManifest, ComponentPreviewPropSpec } from "@t3tools/contracts";
import type { JSX } from "react";

export function propsForExport(
  manifest: ComponentPreviewManifest,
  exportNameValue: string,
): readonly ComponentPreviewPropSpec[] {
  return manifest.propsByExport.find((entry) => entry.exportName === exportNameValue)?.props ?? [];
}

export function summarizePropSpecsForAppendix(specs: readonly ComponentPreviewPropSpec[]): string {
  if (specs.length === 0) {
    return "none";
  }
  return specs.map((spec) => `${spec.name}:${spec.kind}${spec.optional ? "?" : ""}`).join(", ");
}

export function buildDefaultProps(
  specs: readonly ComponentPreviewPropSpec[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const spec of specs) {
    if (spec.defaultJson !== undefined) {
      try {
        out[spec.name] = JSON.parse(spec.defaultJson) as unknown;
        continue;
      } catch {
        /* fall through */
      }
    }
    if (spec.optional) {
      if (spec.kind === "enum" || spec.kind === "literalUnion") {
        const values = spec.enumValues ?? [];
        const preferred =
          values.find((value) => value === "default") ??
          values.find((value) => value === "contained") ??
          values[0];
        if (preferred !== undefined) {
          out[spec.name] = preferred;
        }
      }
      continue;
    }
    switch (spec.kind) {
      case "string":
        out[spec.name] = "";
        break;
      case "number":
        out[spec.name] = 0;
        break;
      case "boolean":
        out[spec.name] = false;
        break;
      case "enum":
      case "literalUnion":
        out[spec.name] = spec.enumValues?.[0] ?? "";
        break;
      case "reactNode":
        out[spec.name] = null;
        break;
      case "function":
        out[spec.name] = () => undefined;
        break;
      default:
        break;
    }
  }
  return out;
}

export function sortPropSpecsForPanel(
  specs: readonly ComponentPreviewPropSpec[],
): ComponentPreviewPropSpec[] {
  return [...specs].toSorted((a, b) => {
    const rank = (spec: ComponentPreviewPropSpec): number => {
      if (spec.name === "variant") return 0;
      if (spec.kind === "enum" || spec.kind === "literalUnion") return 1;
      return 2;
    };
    const rankDiff = rank(a) - rank(b);
    if (rankDiff !== 0) {
      return rankDiff;
    }
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
}

export function ComponentPreviewPropControl(input: {
  readonly spec: ComponentPreviewPropSpec;
  readonly value: unknown;
  readonly onChange: (next: unknown) => void;
  readonly compact?: boolean;
}): JSX.Element {
  const { spec, value, onChange, compact = false } = input;
  const label = `${spec.name}${spec.optional ? "" : "*"}`;
  const textSize = compact ? "text-xs" : "text-[11px]";

  if (spec.kind === "boolean") {
    return (
      <label className={`flex items-center gap-2 ${textSize}`}>
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span>{label}</span>
      </label>
    );
  }

  if (spec.kind === "number") {
    return (
      <label className={`flex flex-col gap-0.5 ${textSize}`}>
        <span className="text-muted-foreground">{label}</span>
        <input
          type="number"
          className="rounded border border-border bg-background px-2 py-1 font-mono text-xs"
          value={typeof value === "number" ? value : Number(value ?? 0)}
          onChange={(event) => onChange(Number(event.target.value))}
        />
      </label>
    );
  }

  if (spec.kind === "enum" || spec.kind === "literalUnion") {
    const opts = spec.enumValues ?? [];
    const isVariantProp = spec.name === "variant";
    if (isVariantProp && opts.length > 0 && opts.length <= 8) {
      return (
        <div className={`flex flex-col gap-1.5 ${textSize}`}>
          <span className="text-muted-foreground font-medium">{label}</span>
          <div className="flex flex-wrap gap-1">
            {opts.map((opt) => {
              const selected = value === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  className={`rounded-md border px-2 py-1 text-xs capitalize transition-colors active:bg-muted/70 ${
                    selected
                      ? "border-border bg-muted text-foreground"
                      : "border-border/60 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                  onClick={() => onChange(opt)}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      );
    }
    return (
      <label className={`flex flex-col gap-0.5 ${textSize}`}>
        <span className="text-muted-foreground">{label}</span>
        <select
          className="rounded border border-border bg-background px-2 py-1 font-mono text-xs"
          value={typeof value === "string" ? value : String(opts[0] ?? "")}
          onChange={(event) => onChange(event.target.value)}
        >
          {opts.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (spec.kind === "reactNode") {
    // A React node slot: accept plain text and render it as children. Rich JSX
    // isn't authorable from a control, so keep it to a simple string.
    const text = typeof value === "string" ? value : "";
    return (
      <label className={`flex flex-col gap-0.5 ${textSize}`}>
        <span className="text-muted-foreground">{label}</span>
        <input
          type="text"
          placeholder="children text…"
          className="rounded border border-border bg-background px-2 py-1 text-xs"
          value={text}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
    );
  }

  if (spec.kind === "function") {
    // Callback props can't be meaningfully authored in a preview control; show a
    // disabled affordance. The default props already supply a no-op handler so
    // the component still renders.
    return (
      <label className={`flex flex-col gap-0.5 ${textSize}`}>
        <span className="text-muted-foreground">{label}</span>
        <input
          type="text"
          disabled
          aria-disabled
          readOnly
          className="cursor-not-allowed rounded border border-border/60 bg-muted px-2 py-1 font-mono text-muted-foreground text-xs"
          value="() => {} — not editable in preview"
        />
      </label>
    );
  }

  if (
    spec.kind === "object" ||
    spec.kind === "array" ||
    spec.kind === "unsupported" ||
    spec.kind === "unknown"
  ) {
    const text =
      typeof value === "string"
        ? value
        : JSON.stringify(value ?? (spec.kind === "array" ? [] : {}), null, 2);
    return (
      <label className={`flex flex-col gap-0.5 ${textSize}`}>
        <span className="text-muted-foreground">{label}</span>
        <textarea
          className="min-h-[48px] rounded border border-border bg-background px-2 py-1 font-mono text-xs"
          value={text}
          onChange={(event) => {
            try {
              onChange(JSON.parse(event.target.value) as unknown);
            } catch {
              onChange(event.target.value);
            }
          }}
        />
      </label>
    );
  }

  return (
    <label className={`flex flex-col gap-0.5 ${textSize}`}>
      <span className="text-muted-foreground">{label}</span>
      <input
        type="text"
        className="rounded border border-border bg-background px-2 py-1 font-mono text-xs"
        value={typeof value === "string" ? value : String(value ?? "")}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
