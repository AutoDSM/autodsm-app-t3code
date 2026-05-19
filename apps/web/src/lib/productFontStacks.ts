/**
 * Terminal / tooling fonts: read stacks from CSS (`index.css` --font-app-*) so output matches
 * the product without bundling or installing webfonts.
 */
const TERMINAL_FONT_FALLBACK =
  '"SF Mono", "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace, "DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';

export function resolveTerminalFontFamily(mount: HTMLElement | null): string {
  const el = mount ?? (typeof document !== "undefined" ? document.documentElement : null);
  if (!el) {
    return TERMINAL_FONT_FALLBACK;
  }
  const styles = getComputedStyle(el);
  const mono = styles.getPropertyValue("--font-app-mono").trim();
  const sans = styles.getPropertyValue("--font-app-sans").trim();
  const parts = [mono, sans].filter((value) => value.length > 0);
  return parts.length > 0 ? parts.join(", ") : TERMINAL_FONT_FALLBACK;
}
