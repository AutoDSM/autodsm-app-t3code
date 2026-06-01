/** postMessage protocol between component preview parent (chat shell) and iframe / desktop view. */

export const COMPONENT_PREVIEW_MESSAGE_SOURCE = "t3-component-preview";

export const COMPONENT_PREVIEW_CHILD_READY = `${COMPONENT_PREVIEW_MESSAGE_SOURCE}:child-ready`;
export const COMPONENT_PREVIEW_INIT = `${COMPONENT_PREVIEW_MESSAGE_SOURCE}:init`;
export const COMPONENT_PREVIEW_RENDERED = `${COMPONENT_PREVIEW_MESSAGE_SOURCE}:rendered`;
export const COMPONENT_PREVIEW_RUNTIME_ERROR = `${COMPONENT_PREVIEW_MESSAGE_SOURCE}:runtime-error`;
export const COMPONENT_PREVIEW_INTERACTION = `${COMPONENT_PREVIEW_MESSAGE_SOURCE}:interaction`;
export const COMPONENT_PREVIEW_STATUS = `${COMPONENT_PREVIEW_MESSAGE_SOURCE}:status`;
export const COMPONENT_PREVIEW_THEME = `${COMPONENT_PREVIEW_MESSAGE_SOURCE}:theme`;

export type ComponentPreviewTheme = "light" | "dark";

export interface ComponentPreviewInitPayload {
  readonly javascript: string;
  readonly propsJson: string;
  readonly workspaceStyleCss?: string;
  /** Resolved app theme so the iframe paints in the correct mode on first render. */
  readonly resolvedTheme?: ComponentPreviewTheme;
}

/** Sent whenever the app theme toggles while a preview is mounted. */
export interface ComponentPreviewThemePayload {
  readonly resolvedTheme: ComponentPreviewTheme;
}

/**
 * Replaces the indefinite "Waiting for component bundle…" spinner when the
 * parent already knows the bundle pipeline has failed or is stalled. Keeps
 * the iframe a passive renderer — the parent owns the queries.
 */
export interface ComponentPreviewStatusPayload {
  readonly phase: "bundle-error" | "analyzing" | "sidecar-warmup";
  readonly message?: string;
}
