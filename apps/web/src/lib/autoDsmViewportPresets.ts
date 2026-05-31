import type { AutoDsmViewportSpec } from "@t3tools/contracts";

export const AUTODSM_VIEWPORT_PRESETS: readonly AutoDsmViewportSpec[] = [
  { label: "desktop-hd", width: 1280, height: 720, devicePixelRatio: 1 },
  { label: "mobile", width: 390, height: 844, devicePixelRatio: 3 },
  { label: "tablet", width: 834, height: 1112, devicePixelRatio: 2 },
];

export const AUTODSM_DEFAULT_VIEWPORT: AutoDsmViewportSpec = AUTODSM_VIEWPORT_PRESETS[0]!;

export function findAutoDsmViewportByLabel(label: string): AutoDsmViewportSpec | null {
  return AUTODSM_VIEWPORT_PRESETS.find((v) => v.label === label) ?? null;
}

export interface AutoDsmChatLayoutSpec {
  /** Pixel width of the left nav column. */
  readonly navWidth: number;
  /** Pixel width of the right agent column. */
  readonly agentWidth: number;
  /** Whether the left nav is collapsed to icon-only. */
  readonly sidebarCollapsed: boolean;
}

export const AUTODSM_DEFAULT_CHAT_LAYOUT: AutoDsmChatLayoutSpec = {
  navWidth: 280,
  agentWidth: 420,
  sidebarCollapsed: false,
};

export function sanitizeChatLayout(value: unknown): AutoDsmChatLayoutSpec | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Partial<AutoDsmChatLayoutSpec>;
  const navWidth =
    typeof v.navWidth === "number" && Number.isFinite(v.navWidth) && v.navWidth >= 0
      ? v.navWidth
      : AUTODSM_DEFAULT_CHAT_LAYOUT.navWidth;
  const agentWidth =
    typeof v.agentWidth === "number" && Number.isFinite(v.agentWidth) && v.agentWidth >= 0
      ? v.agentWidth
      : AUTODSM_DEFAULT_CHAT_LAYOUT.agentWidth;
  const sidebarCollapsed = typeof v.sidebarCollapsed === "boolean" ? v.sidebarCollapsed : false;
  return { navWidth, agentWidth, sidebarCollapsed };
}

export function sanitizeViewportSpec(value: unknown): AutoDsmViewportSpec | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Partial<AutoDsmViewportSpec>;
  if (
    typeof v.label !== "string" ||
    typeof v.width !== "number" ||
    typeof v.height !== "number" ||
    !Number.isFinite(v.width) ||
    !Number.isFinite(v.height) ||
    v.width <= 0 ||
    v.height <= 0
  ) {
    return null;
  }
  const dpr =
    typeof v.devicePixelRatio === "number" &&
    Number.isFinite(v.devicePixelRatio) &&
    v.devicePixelRatio > 0
      ? v.devicePixelRatio
      : undefined;
  return {
    label: v.label,
    width: v.width,
    height: v.height,
    ...(dpr !== undefined ? { devicePixelRatio: dpr } : {}),
  };
}
