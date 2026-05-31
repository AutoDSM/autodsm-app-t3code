/** postMessage payload from `/auth/callback` popup back to the main AutoDSM window. */
export const AUTODSM_OAUTH_POPUP_MESSAGE = "autodsm:oauth-callback" as const;

export interface AutoDsmOAuthPopupMessage {
  readonly type: typeof AUTODSM_OAUTH_POPUP_MESSAGE;
  readonly search: string;
}

export function isAutoDsmOAuthPopupMessage(value: unknown): value is AutoDsmOAuthPopupMessage {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  return (
    "type" in value &&
    value.type === AUTODSM_OAUTH_POPUP_MESSAGE &&
    "search" in value &&
    typeof value.search === "string"
  );
}

export function buildAutoDsmOAuthPopupMessage(search: string): AutoDsmOAuthPopupMessage {
  return {
    type: AUTODSM_OAUTH_POPUP_MESSAGE,
    search,
  };
}
