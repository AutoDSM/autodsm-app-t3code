/**
 * Display-only helpers for converting CSS `oklch(...)` color values to `rgb(...)`.
 * Stored values in the brand profile stay in their original form — only the
 * rendered text label is transformed.
 *
 * Conversion follows CSS Color Module Level 4:
 *   oklch → oklab → linear sRGB → sRGB (gamma-encoded) → 0..255 integers
 */

export interface OklchComponents {
  readonly L: number; // lightness, 0..1
  readonly C: number; // chroma, ≥ 0
  readonly h: number; // hue, degrees
  readonly alpha: number; // 0..1
}

export interface RgbComponents {
  readonly r: number; // 0..255
  readonly g: number;
  readonly b: number;
  readonly alpha: number; // 0..1
}

const OKLCH_RE =
  /^\s*oklch\(\s*([^\s/)]+)\s+([^\s/)]+)\s+([^\s/)]+)\s*(?:\/\s*([^\s)]+)\s*)?\)\s*$/i;

function parseLightness(raw: string): number | null {
  if (raw.endsWith("%")) {
    const n = Number.parseFloat(raw.slice(0, -1));
    return Number.isFinite(n) ? n / 100 : null;
  }
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : null;
}

function parseChroma(raw: string): number | null {
  if (raw.endsWith("%")) {
    // Per spec, 100% chroma == 0.4 in oklch. Rarely used; supported for completeness.
    const n = Number.parseFloat(raw.slice(0, -1));
    return Number.isFinite(n) ? (n / 100) * 0.4 : null;
  }
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : null;
}

function parseHue(raw: string): number | null {
  const trimmed = raw.toLowerCase();
  let value: number;
  if (trimmed.endsWith("deg")) value = Number.parseFloat(trimmed.slice(0, -3));
  else if (trimmed.endsWith("rad"))
    value = (Number.parseFloat(trimmed.slice(0, -3)) * 180) / Math.PI;
  else if (trimmed.endsWith("turn")) value = Number.parseFloat(trimmed.slice(0, -4)) * 360;
  else if (trimmed.endsWith("grad")) value = (Number.parseFloat(trimmed.slice(0, -4)) * 360) / 400;
  else value = Number.parseFloat(trimmed);
  if (!Number.isFinite(value)) return null;
  // Normalise to [0, 360)
  const normalised = ((value % 360) + 360) % 360;
  return normalised;
}

function parseAlpha(raw: string | undefined): number {
  if (raw === undefined) return 1;
  if (raw.endsWith("%")) {
    const n = Number.parseFloat(raw.slice(0, -1));
    return Number.isFinite(n) ? Math.max(0, Math.min(1, n / 100)) : 1;
  }
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 1;
}

export function parseOklch(value: string): OklchComponents | null {
  const match = OKLCH_RE.exec(value);
  if (!match) return null;
  const L = parseLightness(match[1]!);
  const C = parseChroma(match[2]!);
  const h = parseHue(match[3]!);
  if (L === null || C === null || h === null) return null;
  const alpha = parseAlpha(match[4]);
  return { L, C, h, alpha };
}

export function oklchToRgb(components: OklchComponents): RgbComponents {
  const { L, C, h, alpha } = components;
  const hueRad = (h * Math.PI) / 180;
  const a = C * Math.cos(hueRad);
  const b = C * Math.sin(hueRad);

  // oklab → linear LMS
  const lRoot = L + 0.3963377774 * a + 0.2158037573 * b;
  const mRoot = L - 0.1055613458 * a - 0.0638541728 * b;
  const sRoot = L - 0.0894841775 * a - 1.291485548 * b;

  const lLin = lRoot ** 3;
  const mLin = mRoot ** 3;
  const sLin = sRoot ** 3;

  // linear LMS → linear sRGB
  const rLin = 4.0767416621 * lLin - 3.3077115913 * mLin + 0.2309699292 * sLin;
  const gLin = -1.2684380046 * lLin + 2.6097574011 * mLin - 0.3413193965 * sLin;
  const bLin = -0.0041960863 * lLin - 0.7034186147 * mLin + 1.707614701 * sLin;

  const encode = (x: number): number => {
    const clamped = Math.max(0, Math.min(1, x));
    const encoded = clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * clamped ** (1 / 2.4) - 0.055;
    return Math.round(encoded * 255);
  };

  return {
    r: encode(rLin),
    g: encode(gLin),
    b: encode(bLin),
    alpha,
  };
}

/**
 * Returns the value rendered as `rgb(R G B)` (or `rgb(R G B / A)` when alpha < 1)
 * when the input is an `oklch(...)` color. Any other input — hex, rgb, named,
 * malformed — is returned unchanged so the call site never has to branch.
 */
export function formatOklchValueAsRgb(value: string): string {
  try {
    const oklch = parseOklch(value);
    if (oklch === null) return value;
    const rgb = oklchToRgb(oklch);
    if (rgb.alpha < 1) {
      const alphaStr = Number.isInteger(rgb.alpha)
        ? rgb.alpha.toString()
        : rgb.alpha.toFixed(2).replace(/\.?0+$/, "");
      return `rgb(${rgb.r} ${rgb.g} ${rgb.b} / ${alphaStr})`;
    }
    return `rgb(${rgb.r} ${rgb.g} ${rgb.b})`;
  } catch {
    return value;
  }
}
