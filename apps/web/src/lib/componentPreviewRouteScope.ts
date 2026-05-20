import { parseDiffRouteSearch } from "~/diffRouteSearch";

const PREVIEW_SANDBOX_PATH = "/preview-components-sandbox";
const PREVIEW_RUNTIME_PATH = "/component-preview-runtime";

const NON_THREAD_ROUTE_FIRST_SEGMENTS = new Set([
  "home",
  "settings",
  "onboarding",
  "design-components",
  "design-tokens",
  "pair",
]);

function pathnameSegments(pathname: string): readonly string[] {
  return pathname.split("/").filter((segment) => segment.length > 0);
}

function isThreadLikeRoute(pathname: string): boolean {
  const segments = pathnameSegments(pathname);
  if (segments.length < 2) {
    return false;
  }
  return !NON_THREAD_ROUTE_FIRST_SEGMENTS.has(segments[0] ?? "");
}

/**
 * Returns true when the current route may host an active component preview
 * (thread route with `componentPath`, or the dev preview sandbox page).
 */
export function isComponentPreviewAllowedOnRoute(input: {
  readonly pathname: string;
  readonly search: Record<string, unknown>;
}): boolean {
  const { pathname, search } = input;

  if (
    pathname === PREVIEW_SANDBOX_PATH ||
    pathname.endsWith(PREVIEW_SANDBOX_PATH) ||
    pathname === PREVIEW_RUNTIME_PATH ||
    pathname.endsWith(PREVIEW_RUNTIME_PATH)
  ) {
    return true;
  }

  const { componentPath } = parseDiffRouteSearch(search);
  if (!componentPath) {
    return false;
  }

  return isThreadLikeRoute(pathname);
}

/** Returns true when route guard should detach all native preview views. */
export function shouldDetachAllComponentPreviewsOnRoute(input: {
  readonly pathname: string;
  readonly search: Record<string, unknown>;
}): boolean {
  return !isComponentPreviewAllowedOnRoute(input);
}
