export const PRODUCT_BASE_NAME = "AutoDSM";

export function resolveProductDisplayName(stageLabel: string): string {
  return `${PRODUCT_BASE_NAME} (${stageLabel})`;
}
