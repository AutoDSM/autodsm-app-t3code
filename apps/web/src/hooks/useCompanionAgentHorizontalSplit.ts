import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";

import {
  isComponentPreviewOverlaySuppressed,
  subscribeComponentPreviewOverlaySuppression,
} from "~/lib/componentPreviewOverlaySuppression";

/** Persisted companion (left) width as `%` of the split row. */
export const CHAT_COMPANION_AGENT_SPLIT_STORAGE_KEY = "chat.companion-agent.split-left-pct-v1";

/** Persisted coding-agent (right) width in px when component preview is active. */
export const CHAT_PREVIEW_AGENT_SPLIT_STORAGE_KEY = "chat.preview-agent.split-right-width-px-v2";

/** Default **60% companion (left)** / **40% coding agent (right)**. */
export const CHAT_COMPANION_AGENT_SPLIT_DEFAULT_LEFT_PCT = 60;

/** @deprecated Preview/agent split now uses fixed right width — see {@link CHAT_PREVIEW_AGENT_DEFAULT_RIGHT_WIDTH_REM}. */
export const CHAT_PREVIEW_AGENT_SPLIT_DEFAULT_LEFT_PCT = 68;

/** Matches {@link SIDEBAR_WIDTH} (`16rem`) in the left thread sidebar. */
export const CHAT_LEFT_SIDEBAR_REFERENCE_WIDTH_REM = 16;

/** Default coding-agent column — same scale as left sidebar, slightly wider. */
export const CHAT_PREVIEW_AGENT_DEFAULT_RIGHT_WIDTH_REM = 20;

export const PREVIEW_AGENT_SPLITTER_HIT_PX = 9;

export const PREVIEW_AGENT_MIN_RIGHT_WIDTH_REM = 15;
export const PREVIEW_AGENT_MAX_RIGHT_WIDTH_REM = 26;
/** Preview column flexes freely — no fixed minimum (avoids grid jumps when overlays open). */
export const PREVIEW_AGENT_MIN_PREVIEW_WIDTH_REM = 0;

const SPLITTER_HIT_PX = PREVIEW_AGENT_SPLITTER_HIT_PX;
const REM_PX = 16;

const SPLIT_MIN_LEFT_PCT = 18;
const SPLIT_MAX_LEFT_PCT = 78;

export function previewAgentRemToPx(rem: number): number {
  return Math.round(rem * REM_PX);
}

function clampPct(value: number): number {
  if (!Number.isFinite(value)) {
    return CHAT_COMPANION_AGENT_SPLIT_DEFAULT_LEFT_PCT;
  }
  const rounded = Math.round(value);
  return Math.min(SPLIT_MAX_LEFT_PCT, Math.max(SPLIT_MIN_LEFT_PCT, rounded));
}

function clampRightWidthPx(value: number, defaultPx: number): number {
  if (!Number.isFinite(value)) {
    return defaultPx;
  }
  const rounded = Math.round(value);
  const minPx = previewAgentRemToPx(PREVIEW_AGENT_MIN_RIGHT_WIDTH_REM);
  const maxPx = previewAgentRemToPx(PREVIEW_AGENT_MAX_RIGHT_WIDTH_REM);
  return Math.min(maxPx, Math.max(minPx, rounded));
}

/** Keeps agent + preview columns inside a split pane (used by drag + pane resize). */
export function clampRightWidthForPane(
  rightWidthPx: number,
  paneWidthPx: number,
  defaultPx: number,
): number {
  const minPreviewPx = previewAgentRemToPx(PREVIEW_AGENT_MIN_PREVIEW_WIDTH_REM);
  const maxRightForPane = Math.max(
    previewAgentRemToPx(PREVIEW_AGENT_MIN_RIGHT_WIDTH_REM),
    paneWidthPx - SPLITTER_HIT_PX - minPreviewPx,
  );
  return clampRightWidthPx(Math.min(rightWidthPx, maxRightForPane), defaultPx);
}

export function buildPreviewAgentGridTemplateColumns(rightWidthPx: number): string {
  const minPreviewPx = previewAgentRemToPx(PREVIEW_AGENT_MIN_PREVIEW_WIDTH_REM);
  const minAgentPx = previewAgentRemToPx(PREVIEW_AGENT_MIN_RIGHT_WIDTH_REM);
  return `minmax(${String(minPreviewPx)}px, 1fr) ${String(SPLITTER_HIT_PX)}px minmax(${String(minAgentPx)}px, ${String(rightWidthPx)}px)`;
}

function readStoredLeftPct(storageKey: string): number | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(storageKey);
    const n = Number(raw);
    if (!Number.isFinite(n)) {
      return null;
    }
    return clampPct(n);
  } catch {
    return null;
  }
}

function readStoredRightWidthPx(storageKey: string, defaultPx: number): number | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(storageKey);
    const n = Number(raw);
    if (!Number.isFinite(n)) {
      return null;
    }
    return clampRightWidthPx(n, defaultPx);
  } catch {
    return null;
  }
}

function persistLeftPct(storageKey: string, pct: number): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(storageKey, String(clampPct(pct)));
  } catch {
    /* ignore quota / privacy mode */
  }
}

function persistRightWidthPx(storageKey: string, px: number, defaultPx: number): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(storageKey, String(clampRightWidthPx(px, defaultPx)));
  } catch {
    /* ignore quota / privacy mode */
  }
}

type SplitMode = "left-pct" | "right-fixed";

export interface UseCompanionAgentHorizontalSplitOptions {
  readonly storageKey?: string;
  readonly splitMode?: SplitMode;
  readonly defaultLeftPct?: number;
  readonly defaultRightWidthRem?: number;
}

export interface UseCompanionAgentHorizontalSplitResult {
  readonly splitMeasureRef: RefObject<HTMLDivElement | null>;
  readonly gridTemplateColumns: string | undefined;
  readonly onSplitterPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
}

/**
 * Draggable companion ↔ agent splitter for ChatView (`md+` only — consumers gate layout).
 *
 * - `left-pct`: persisted `%` for the left column; right column absorbs the remainder.
 * - `right-fixed`: preview column flexes (`1fr`); coding agent uses a fixed px width (resizable).
 */
export function useCompanionAgentHorizontalSplit(
  splitEnabled: boolean,
  options?: UseCompanionAgentHorizontalSplitOptions,
): UseCompanionAgentHorizontalSplitResult {
  const splitMode = options?.splitMode ?? "left-pct";
  const storageKey = options?.storageKey ?? CHAT_COMPANION_AGENT_SPLIT_STORAGE_KEY;
  const defaultLeftPct = options?.defaultLeftPct ?? CHAT_COMPANION_AGENT_SPLIT_DEFAULT_LEFT_PCT;
  const defaultRightWidthRem =
    options?.defaultRightWidthRem ?? CHAT_PREVIEW_AGENT_DEFAULT_RIGHT_WIDTH_REM;
  const defaultRightWidthPx = previewAgentRemToPx(defaultRightWidthRem);

  const [leftPct, setLeftPct] = useState(defaultLeftPct);
  const [rightWidthPx, setRightWidthPx] = useState(defaultRightWidthPx);
  const draggingRef = useRef(false);
  const leftPctDraggingRef = useRef(leftPct);
  const rightWidthDraggingRef = useRef(rightWidthPx);
  const splitMeasureRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    leftPctDraggingRef.current = leftPct;
  }, [leftPct]);

  useLayoutEffect(() => {
    rightWidthDraggingRef.current = rightWidthPx;
  }, [rightWidthPx]);

  useLayoutEffect(() => {
    if (!splitEnabled) {
      return;
    }
    if (splitMode === "right-fixed") {
      const hydrated = readStoredRightWidthPx(storageKey, defaultRightWidthPx);
      const next = hydrated ?? defaultRightWidthPx;
      setRightWidthPx(next);
      rightWidthDraggingRef.current = next;
      return;
    }
    const hydrated = readStoredLeftPct(storageKey);
    if (hydrated != null) {
      setLeftPct(hydrated);
      leftPctDraggingRef.current = hydrated;
    } else {
      setLeftPct(defaultLeftPct);
      leftPctDraggingRef.current = defaultLeftPct;
    }
  }, [defaultLeftPct, defaultRightWidthPx, splitEnabled, splitMode, storageKey]);

  const reclampRightWidthForCurrentPane = useCallback(() => {
    if (!splitEnabled || splitMode !== "right-fixed" || draggingRef.current) {
      return;
    }
    if (isComponentPreviewOverlaySuppressed()) {
      return;
    }
    const pane = splitMeasureRef.current;
    if (!pane) {
      return;
    }
    const paneWidth = pane.clientWidth;
    if (paneWidth <= 0) {
      return;
    }
    const next = clampRightWidthForPane(
      rightWidthDraggingRef.current,
      paneWidth,
      defaultRightWidthPx,
    );
    if (next === rightWidthDraggingRef.current) {
      return;
    }
    rightWidthDraggingRef.current = next;
    setRightWidthPx(next);
  }, [defaultRightWidthPx, splitEnabled, splitMode]);

  useLayoutEffect(() => {
    if (!splitEnabled || splitMode !== "right-fixed") {
      return;
    }
    const pane = splitMeasureRef.current;
    if (!pane) {
      return;
    }

    reclampRightWidthForCurrentPane();

    const observer = new ResizeObserver(() => {
      reclampRightWidthForCurrentPane();
    });
    observer.observe(pane);

    const unsubscribeOverlaySuppression = subscribeComponentPreviewOverlaySuppression(() => {
      if (!isComponentPreviewOverlaySuppressed()) {
        reclampRightWidthForCurrentPane();
      }
    });

    return () => {
      observer.disconnect();
      unsubscribeOverlaySuppression();
    };
  }, [reclampRightWidthForCurrentPane, splitEnabled, splitMode]);

  const onSplitterPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!splitEnabled) {
        return;
      }
      if (event.pointerType === "touch") {
        return;
      }
      if (event.button !== 0) {
        return;
      }

      event.preventDefault();
      const pane = splitMeasureRef.current;
      if (!pane) {
        return;
      }

      const separator = event.currentTarget;
      const pointerIdCaptured = event.pointerId;
      separator.setPointerCapture(pointerIdCaptured);
      draggingRef.current = true;
      document.body.dataset.companionAgentSplitDragging = "1";

      const updateFromClientX = (clientX: number) => {
        const rect = pane.getBoundingClientRect();
        const width = rect.width;
        if (width <= 0) {
          return;
        }

        if (splitMode === "right-fixed") {
          const splitOffset = clientX - rect.left;
          const nextRight = clampRightWidthForPane(
            width - splitOffset - SPLITTER_HIT_PX,
            width,
            defaultRightWidthPx,
          );
          rightWidthDraggingRef.current = nextRight;
          setRightWidthPx(nextRight);
          return;
        }

        const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / width));
        const nextPct = clampPct(ratio * 100);
        leftPctDraggingRef.current = nextPct;
        setLeftPct(nextPct);
      };

      const onMove = (e: PointerEvent) => {
        if (!draggingRef.current) return;
        updateFromClientX(e.clientX);
      };

      const onEnd = () => {
        draggingRef.current = false;
        delete document.body.dataset.companionAgentSplitDragging;
        try {
          separator.releasePointerCapture(pointerIdCaptured);
        } catch {
          /* already released */
        }
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onEnd);
        window.removeEventListener("pointercancel", onEnd);
        if (splitMode === "right-fixed") {
          persistRightWidthPx(storageKey, rightWidthDraggingRef.current, defaultRightWidthPx);
        } else {
          persistLeftPct(storageKey, leftPctDraggingRef.current);
        }
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onEnd);
      window.addEventListener("pointercancel", onEnd);
    },
    [defaultRightWidthPx, splitEnabled, splitMode, storageKey],
  );

  const gridTemplateColumns = useMemo(() => {
    if (!splitEnabled) return undefined;
    if (splitMode === "right-fixed") {
      return buildPreviewAgentGridTemplateColumns(rightWidthPx);
    }
    return `${leftPct}% ${String(SPLITTER_HIT_PX)}px minmax(0, 1fr)`;
  }, [leftPct, rightWidthPx, splitEnabled, splitMode]);

  return {
    splitMeasureRef,
    gridTemplateColumns,
    onSplitterPointerDown,
  };
}
