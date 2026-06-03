import { describe, expect, it } from "vitest";

import { extractCssVarTokenNames } from "./componentTokenUsage.ts";

describe("extractCssVarTokenNames", () => {
  it("extracts distinct token names from var(--x) references", () => {
    const source = `
      const cls = "bg-[var(--primary)] text-[var(--foreground)] border-[var(--border)]";
    `;
    expect(extractCssVarTokenNames(source)).toEqual(["border", "foreground", "primary"]);
  });

  it("dedupes repeated references and ignores fallbacks", () => {
    const source = `
      "ring-[var(--ring,var(--primary))] bg-[var(--primary)] hover:bg-[var(--primary)]"
    `;
    // --primary appears 3x, --ring once → distinct names only.
    expect(extractCssVarTokenNames(source)).toEqual(["primary", "ring"]);
  });

  it("handles whitespace inside var() and hyphenated names", () => {
    const source = `color: var( --secondary-foreground ); width: var(--space-4);`;
    expect(extractCssVarTokenNames(source)).toEqual(["secondary-foreground", "space-4"]);
  });

  it("returns an empty array when there are no token references", () => {
    expect(extractCssVarTokenNames(`const x = 1; // no tokens here`)).toEqual([]);
  });
});
