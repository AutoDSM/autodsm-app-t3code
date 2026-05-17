import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";

/** Persisted companion (left) width as `%` of the split row. */
export const CHAT_COMPANION_AGENT_SPLIT_STORAGE_KEY = "chat.companion-agent.split-left-pct-v1";

/** Default **60% companion (left)** / **40% coding agent (right)**. */
export const CHAT_COMPANION_AGENT_SPLIT_DEFAULT_LEFT_PCT = 60;

const SPLITTER_HIT_PX = 9;

const SPLIT_MIN_LEFT_PCT = 18;
const SPLIT_MAX_LEFT_PCT = 78;

function clampPct(value: number): number {
  if (!Number.isFinite(value)) {
    return CHAT_COMPANION_AGENT_SPLIT_DEFAULT_LEFT_PCT;
  }
  const rounded = Math.round(value);
  return Math.min(SPLIT_MAX_LEFT_PCT, Math.max(SPLIT_MIN_LEFT_PCT, rounded));
}

function readStoredLeftPct(): number | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(CHAT_COMPANION_AGENT_SPLIT_STORAGE_KEY);
    const n = Number(raw);
    if (!Number.isFinite(n)) {
      return null;
    }
    return clampPct(n);
  } catch {
    return null;
  }
}

function persistLeftPct(pct: number): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(CHAT_COMPANION_AGENT_SPLIT_STORAGE_KEY, String(clampPct(pct)));
  } catch {
    /* ignore quota / privacy mode */
  }
}

export interface UseCompanionAgentHorizontalSplitResult {
  readonly splitMeasureRef: RefObject<HTMLDivElement | null>;
  readonly gridTemplateColumns: string | undefined;
  readonly onSplitterPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
}

/**
 * Draggable companion ↔ agent splitter for ChatView (`md+` only — consumers gate layout).
 *
 * Persisted as `% of row width`; agent column absorbs the remainder (minus splitter gutter).
 */
export function useCompanionAgentHorizontalSplit(
  splitEnabled: boolean,
): UseCompanionAgentHorizontalSplitResult {
  const [leftPct, setLeftPct] = useState(CHAT_COMPANION_AGENT_SPLIT_DEFAULT_LEFT_PCT);
  const draggingRef = useRef(false);
  const leftPctDraggingRef = useRef(leftPct);
  const splitMeasureRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    leftPctDraggingRef.current = leftPct;
  }, [leftPct]);

  useLayoutEffect(() => {
    if (!splitEnabled) {
      return;
    }
    const hydrated = readStoredLeftPct();
    if (hydrated != null) {
      setLeftPct(hydrated);
      leftPctDraggingRef.current = hydrated;
    }
  }, [splitEnabled]);

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
        persistLeftPct(leftPctDraggingRef.current);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onEnd);
      window.addEventListener("pointercancel", onEnd);
    },
    [splitEnabled],
  );

  const gridTemplateColumns = useMemo(() => {
    if (!splitEnabled) return undefined;
    return `${leftPct}% ${String(SPLITTER_HIT_PX)}px minmax(0, 1fr)`;
  }, [leftPct, splitEnabled]);

  return {
    splitMeasureRef,
    gridTemplateColumns,
    onSplitterPointerDown,
  };
}
