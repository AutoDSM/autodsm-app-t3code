/** postMessage protocol between component preview parent (chat shell) and iframe / desktop view. */

export const COMPONENT_PREVIEW_MESSAGE_SOURCE = "t3-component-preview";

export const COMPONENT_PREVIEW_CHILD_READY = `${COMPONENT_PREVIEW_MESSAGE_SOURCE}:child-ready`;
export const COMPONENT_PREVIEW_INIT = `${COMPONENT_PREVIEW_MESSAGE_SOURCE}:init`;
export const COMPONENT_PREVIEW_RENDERED = `${COMPONENT_PREVIEW_MESSAGE_SOURCE}:rendered`;
export const COMPONENT_PREVIEW_RUNTIME_ERROR = `${COMPONENT_PREVIEW_MESSAGE_SOURCE}:runtime-error`;
export const COMPONENT_PREVIEW_INTERACTION = `${COMPONENT_PREVIEW_MESSAGE_SOURCE}:interaction`;

export interface ComponentPreviewInitPayload {
  readonly javascript: string;
  readonly propsJson: string;
}
