export interface ParsedDesignTokenLength {
  readonly px: number;
  readonly unit: string;
  readonly raw: string;
}

const LENGTH_RE = /^\s*(-?\d*\.?\d+)\s*(px|rem|em|%)?\s*$/i;

/** Parse CSS length tokens into comparable pixel values (16px = 1rem). */
export function parseDesignTokenLength(
  raw: string,
  rootFontPx = 16,
): ParsedDesignTokenLength | null {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return null;
  }
  const match = LENGTH_RE.exec(trimmed);
  if (!match) {
    const numeric = Number.parseFloat(trimmed);
    if (Number.isFinite(numeric)) {
      return { px: numeric, unit: "", raw: trimmed };
    }
    return null;
  }
  const amount = Number.parseFloat(match[1] ?? "");
  if (!Number.isFinite(amount)) {
    return null;
  }
  const unit = (match[2] ?? "").toLowerCase();
  let px = amount;
  if (unit === "rem" || unit === "em") {
    px = amount * rootFontPx;
  } else if (unit === "%") {
    px = (amount / 100) * rootFontPx;
  }
  return { px, unit: unit.length > 0 ? unit : "px", raw: trimmed };
}

/** Largest parsed px value in a token list (minimum 1 for bar scaling). */
export function maxDesignTokenLengthPx(values: readonly string[], rootFontPx = 16): number {
  let max = 1;
  for (const value of values) {
    const parsed = parseDesignTokenLength(value, rootFontPx);
    if (parsed && parsed.px > max) {
      max = parsed.px;
    }
  }
  return max;
}
