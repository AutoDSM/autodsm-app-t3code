export const PRODUCT_BASE_NAME = "AutoDSM";

export function resolveProductDisplayName(stageLabel: string): string {
  // The stable release channel ("Alpha"/"Latest") ships as the bare product
  // name; pre-release channels (Dev, Nightly) keep a suffix so builds stay
  // distinguishable in the dock and About dialog.
  if (!stageLabel || stageLabel === "Alpha" || stageLabel === "Latest") {
    return PRODUCT_BASE_NAME;
  }
  return `${PRODUCT_BASE_NAME} (${stageLabel})`;
}
