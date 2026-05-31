import { describe, expect, it } from "vitest";

import {
  PREVIEW_REACT_EXTERNAL_FILTER,
  PREVIEW_REACT_EXTERNALS,
  PREVIEW_REACT_GLOBAL,
  REACT_DOM_NAMED_EXPORTS,
  REACT_JSX_DEV_RUNTIME_NAMED_EXPORTS,
  REACT_JSX_RUNTIME_NAMED_EXPORTS,
  REACT_NAMED_EXPORTS,
} from "./reactRuntimeExports.ts";

// Note: the manifest is pinned to the iframe's React (apps/web's react@19.2.x),
// NOT this test environment's React (which resolves to a different version).
// These tests verify the manifest is well-formed — no duplicates, no
// internals, correct routing — rather than dynamically validating against
// the wrong React.

describe("PREVIEW_REACT_GLOBAL", () => {
  it("is the expected global identifier", () => {
    expect(PREVIEW_REACT_GLOBAL).toBe("__T3_PREVIEW_REACT__");
  });
});

describe("PREVIEW_REACT_EXTERNAL_FILTER", () => {
  it("matches the four specifiers we externalise", () => {
    expect(PREVIEW_REACT_EXTERNAL_FILTER.test("react")).toBe(true);
    expect(PREVIEW_REACT_EXTERNAL_FILTER.test("react-dom")).toBe(true);
    expect(PREVIEW_REACT_EXTERNAL_FILTER.test("react/jsx-runtime")).toBe(true);
    expect(PREVIEW_REACT_EXTERNAL_FILTER.test("react/jsx-dev-runtime")).toBe(true);
  });

  it("does not match unrelated specifiers", () => {
    expect(PREVIEW_REACT_EXTERNAL_FILTER.test("react-dom/client")).toBe(false);
    expect(PREVIEW_REACT_EXTERNAL_FILTER.test("react-router")).toBe(false);
    expect(PREVIEW_REACT_EXTERNAL_FILTER.test("react/server")).toBe(false);
    expect(PREVIEW_REACT_EXTERNAL_FILTER.test("preact")).toBe(false);
  });
});

describe("manifest hygiene", () => {
  it("REACT_NAMED_EXPORTS has no duplicates", () => {
    const set = new Set(REACT_NAMED_EXPORTS);
    expect(set.size).toBe(REACT_NAMED_EXPORTS.length);
  });

  it("REACT_NAMED_EXPORTS contains no internals", () => {
    for (const name of REACT_NAMED_EXPORTS) {
      expect(name.startsWith("__"), `${name} looks like an internal`).toBe(false);
    }
  });

  it("REACT_NAMED_EXPORTS does not list form-status hooks (they live in react-dom in React 19+)", () => {
    expect((REACT_NAMED_EXPORTS as readonly string[]).includes("useFormStatus")).toBe(false);
    expect((REACT_NAMED_EXPORTS as readonly string[]).includes("useFormState")).toBe(false);
  });

  it("REACT_NAMED_EXPORTS includes the hooks the failing user-component error specifically required", () => {
    // Counters that the dispatcher-null crash flagged for the user.
    const required = ["useState", "useEffect", "useMemo", "useCallback", "useRef", "forwardRef"];
    for (const name of required) {
      expect((REACT_NAMED_EXPORTS as readonly string[]).includes(name)).toBe(true);
    }
  });

  it("REACT_JSX_RUNTIME_NAMED_EXPORTS has the standard automatic-jsx surface", () => {
    expect([...REACT_JSX_RUNTIME_NAMED_EXPORTS].sort()).toEqual(["Fragment", "jsx", "jsxs"]);
  });

  it("REACT_JSX_DEV_RUNTIME_NAMED_EXPORTS has the standard dev-jsx surface", () => {
    expect([...REACT_JSX_DEV_RUNTIME_NAMED_EXPORTS].sort()).toEqual(["Fragment", "jsxDEV"]);
  });

  it("REACT_DOM_NAMED_EXPORTS lists portal and the form-status hooks", () => {
    expect((REACT_DOM_NAMED_EXPORTS as readonly string[]).includes("createPortal")).toBe(true);
    expect((REACT_DOM_NAMED_EXPORTS as readonly string[]).includes("flushSync")).toBe(true);
    expect((REACT_DOM_NAMED_EXPORTS as readonly string[]).includes("useFormStatus")).toBe(true);
    expect((REACT_DOM_NAMED_EXPORTS as readonly string[]).includes("useFormState")).toBe(true);
  });
});

describe("PREVIEW_REACT_EXTERNALS", () => {
  it("covers exactly the four specifiers we externalise", () => {
    expect(Object.keys(PREVIEW_REACT_EXTERNALS).sort()).toEqual([
      "react",
      "react-dom",
      "react/jsx-dev-runtime",
      "react/jsx-runtime",
    ]);
  });

  it("each specifier's list is non-empty", () => {
    for (const [specifier, names] of Object.entries(PREVIEW_REACT_EXTERNALS)) {
      expect(names.length, `${specifier} should have at least one export`).toBeGreaterThan(0);
    }
  });
});
