import { create } from "zustand";

export type ComponentPreviewOverlaySuppressionReason =
  | "model-picker"
  | "command-palette"
  | "mobile-sidebar"
  | "dialog"
  | "sheet"
  | "preview-portal";

interface ComponentPreviewOverlaySuppressionStore {
  readonly counts: Readonly<Record<ComponentPreviewOverlaySuppressionReason, number>>;
  readonly setSuppressed: (
    reason: ComponentPreviewOverlaySuppressionReason,
    active: boolean,
  ) => void;
}

const REASONS: readonly ComponentPreviewOverlaySuppressionReason[] = [
  "model-picker",
  "command-palette",
  "mobile-sidebar",
  "dialog",
  "sheet",
  "preview-portal",
];

function emptyCounts(): Record<ComponentPreviewOverlaySuppressionReason, number> {
  return {
    "model-picker": 0,
    "command-palette": 0,
    "mobile-sidebar": 0,
    dialog: 0,
    sheet: 0,
    "preview-portal": 0,
  };
}

function isSuppressed(
  counts: Readonly<Record<ComponentPreviewOverlaySuppressionReason, number>>,
): boolean {
  return REASONS.some((reason) => counts[reason] > 0);
}

const useComponentPreviewOverlaySuppressionStore = create<ComponentPreviewOverlaySuppressionStore>(
  (set) => ({
    counts: emptyCounts(),
    setSuppressed: (reason, active) => {
      set((current) => {
        const nextCount = Math.max(0, current.counts[reason] + (active ? 1 : -1));
        if (nextCount === current.counts[reason]) {
          return current;
        }
        return {
          counts: {
            ...current.counts,
            [reason]: nextCount,
          },
        };
      });
    },
  }),
);

export function setComponentPreviewOverlaySuppressed(
  reason: ComponentPreviewOverlaySuppressionReason,
  active: boolean,
): void {
  useComponentPreviewOverlaySuppressionStore.getState().setSuppressed(reason, active);
}

export function isComponentPreviewOverlaySuppressed(): boolean {
  return isSuppressed(useComponentPreviewOverlaySuppressionStore.getState().counts);
}

export function useComponentPreviewOverlaySuppressed(): boolean {
  return useComponentPreviewOverlaySuppressionStore((state) => isSuppressed(state.counts));
}

export function subscribeComponentPreviewOverlaySuppression(listener: () => void): () => void {
  return useComponentPreviewOverlaySuppressionStore.subscribe((state, previous) => {
    if (isSuppressed(state.counts) !== isSuppressed(previous.counts)) {
      listener();
    }
  });
}

/** Test-only: reset suppression counts between unit tests. */
export function resetComponentPreviewOverlaySuppressionForTests(): void {
  useComponentPreviewOverlaySuppressionStore.setState({ counts: emptyCounts() });
}
