/**
 * Shared manifest of the named exports the iframe preview is allowed to
 * proxy through `globalThis.__T3_PREVIEW_REACT__`. Used by:
 *
 * - `bundleComponentPreview.ts` — the esbuild plugin emits stub modules
 *   whose named exports come from these lists, so the bundled component's
 *   `import { useState } from "react"` resolves to the host iframe's
 *   `React.useState` instead of a second bundled React instance (which is
 *   what produces the "Cannot read properties of null (reading 'useState')"
 *   error when the dispatcher comes up null).
 * - `reactRuntimeExports.test.ts` — pins every entry against the real
 *   React module shape so a future React upgrade has to acknowledge the
 *   manifest rather than silently dropping a hook.
 *
 * If you add a new entry that doesn't exist in the installed React
 * version, the test fails. If a workspace component imports something we
 * haven't listed here, the bundled stub will throw at evaluation time
 * with a "not registered" message — which is preferable to a silent
 * undefined.
 */

export const PREVIEW_REACT_GLOBAL = "__T3_PREVIEW_REACT__" as const;

// Names pinned against `import * as React from "react"` shape on the installed
// React version. Internals (anything prefixed `__`) are intentionally
// excluded. If a workspace component needs a name not listed here, the
// bundled stub throws at evaluation time — preferable to a silent undefined.
export const REACT_NAMED_EXPORTS = [
  "Activity",
  "Children",
  "Component",
  "Fragment",
  "Profiler",
  "PureComponent",
  "StrictMode",
  "Suspense",
  "act",
  "cache",
  "cacheSignal",
  "captureOwnerStack",
  "cloneElement",
  "createContext",
  "createElement",
  "createRef",
  "forwardRef",
  "isValidElement",
  "lazy",
  "memo",
  "startTransition",
  "unstable_useCacheRefresh",
  "use",
  "useActionState",
  "useCallback",
  "useContext",
  "useDebugValue",
  "useDeferredValue",
  "useEffect",
  "useEffectEvent",
  "useId",
  "useImperativeHandle",
  "useInsertionEffect",
  "useLayoutEffect",
  "useMemo",
  "useOptimistic",
  "useReducer",
  "useRef",
  "useState",
  "useSyncExternalStore",
  "useTransition",
  "version",
] as const;

export const REACT_JSX_RUNTIME_NAMED_EXPORTS = ["Fragment", "jsx", "jsxs"] as const;

export const REACT_JSX_DEV_RUNTIME_NAMED_EXPORTS = ["Fragment", "jsxDEV"] as const;

// `useFormStatus` and `useFormState` live in react-dom (NOT react) in React 19.
export const REACT_DOM_NAMED_EXPORTS = [
  "createPortal",
  "flushSync",
  "preconnect",
  "prefetchDNS",
  "preinit",
  "preinitModule",
  "preload",
  "preloadModule",
  "requestFormReset",
  "unstable_batchedUpdates",
  "useFormState",
  "useFormStatus",
  "version",
] as const;

/** The external specifiers and their corresponding allowed names. */
export const PREVIEW_REACT_EXTERNALS: Record<string, readonly string[]> = {
  react: REACT_NAMED_EXPORTS,
  "react/jsx-runtime": REACT_JSX_RUNTIME_NAMED_EXPORTS,
  "react/jsx-dev-runtime": REACT_JSX_DEV_RUNTIME_NAMED_EXPORTS,
  "react-dom": REACT_DOM_NAMED_EXPORTS,
};

/** Regex matching only the specifiers we externalise. */
export const PREVIEW_REACT_EXTERNAL_FILTER =
  /^react(\/jsx-runtime|\/jsx-dev-runtime)?$|^react-dom$/;
