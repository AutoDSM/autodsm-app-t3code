"use client";

import type { AutoDsmBrandToken } from "@t3tools/contracts";
import { useCallback, useMemo, useState } from "react";

import type { ComposerCommandItem } from "~/components/chat/ComposerCommandMenu";
import {
  type ComposerTrigger,
  detectComposerTrigger,
  type DetectComposerTriggerOptions,
} from "~/composer-logic";
import { buildBrandTokenComposerMenuItems } from "~/lib/brandTokenComposerMenu";

export interface UseBrandTokenComposerMenuInput {
  readonly brandTokens: readonly AutoDsmBrandToken[];
  readonly prompt: string;
  readonly expandedCursor: number;
  readonly suppressTrigger?: boolean;
}

export function useBrandTokenComposerMenu(input: UseBrandTokenComposerMenuInput): {
  readonly brandTokenMode: boolean;
  readonly trigger: ComposerTrigger | null;
  readonly menuItems: readonly ComposerCommandItem[];
  readonly menuOpen: boolean;
  readonly menuSearchKey: string | null;
  readonly highlightedItemId: string | null;
  readonly activeMenuItem: ComposerCommandItem | null;
  readonly setHighlightedItemId: (itemId: string | null) => void;
  readonly nudgeHighlight: (direction: "ArrowDown" | "ArrowUp") => void;
  readonly detectTrigger: (
    text: string,
    cursor: number,
    options?: DetectComposerTriggerOptions,
  ) => ComposerTrigger | null;
} {
  const { brandTokens, prompt, expandedCursor, suppressTrigger = false } = input;
  const brandTokenMode = brandTokens.length > 0;
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);
  const [highlightedSearchKey, setHighlightedSearchKey] = useState<string | null>(null);

  const detectTrigger = useCallback(
    (text: string, cursor: number, options?: DetectComposerTriggerOptions) =>
      detectComposerTrigger(text, cursor, {
        brandTokenMode,
        ...options,
      }),
    [brandTokenMode],
  );

  const trigger = useMemo(() => {
    if (suppressTrigger || !brandTokenMode) {
      return null;
    }
    const detected = detectTrigger(prompt, expandedCursor);
    return detected?.kind === "brand-token" ? detected : null;
  }, [brandTokenMode, detectTrigger, expandedCursor, prompt, suppressTrigger]);

  const menuItems = useMemo(() => {
    if (!trigger || trigger.kind !== "brand-token") {
      return [];
    }
    return buildBrandTokenComposerMenuItems(brandTokens, trigger.query);
  }, [brandTokens, trigger]);

  const menuSearchKey = trigger ? `${trigger.kind}:${trigger.query.trim().toLowerCase()}` : null;
  const menuOpen = trigger !== null;

  const activeMenuItem = useMemo(() => {
    if (menuItems.length === 0) {
      return null;
    }
    const activeId =
      highlightedSearchKey === menuSearchKey && highlightedItemId
        ? highlightedItemId
        : (menuItems[0]?.id ?? null);
    return menuItems.find((item) => item.id === activeId) ?? menuItems[0] ?? null;
  }, [highlightedItemId, highlightedSearchKey, menuItems, menuSearchKey]);

  const setHighlightedItemIdWithKey = useCallback(
    (itemId: string | null) => {
      setHighlightedItemId(itemId);
      setHighlightedSearchKey(menuSearchKey);
    },
    [menuSearchKey],
  );

  const nudgeHighlight = useCallback(
    (direction: "ArrowDown" | "ArrowUp") => {
      if (menuItems.length === 0) {
        return;
      }
      const highlightedIndex = menuItems.findIndex((item) => item.id === highlightedItemId);
      const normalizedIndex =
        highlightedIndex >= 0 ? highlightedIndex : direction === "ArrowDown" ? -1 : 0;
      const offset = direction === "ArrowDown" ? 1 : -1;
      const nextIndex = (normalizedIndex + offset + menuItems.length) % menuItems.length;
      const nextItem = menuItems[nextIndex];
      setHighlightedItemId(nextItem?.id ?? null);
      setHighlightedSearchKey(menuSearchKey);
    },
    [highlightedItemId, menuItems, menuSearchKey],
  );

  return {
    brandTokenMode,
    trigger,
    menuItems,
    menuOpen,
    menuSearchKey,
    highlightedItemId,
    activeMenuItem,
    setHighlightedItemId: setHighlightedItemIdWithKey,
    nudgeHighlight,
    detectTrigger,
  };
}
