"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowUpIcon, CornerUpRightIcon } from "lucide-react";
import { useCallback, useMemo, useRef, useState, type JSX, type RefObject } from "react";

import { expandCollapsedComposerCursor, replaceTextRange } from "~/composer-logic";
import {
  ComposerPromptEditor,
  type ComposerPromptEditorHandle,
} from "~/components/ComposerPromptEditor";
import { ComposerPromptShell } from "~/components/chat/ComposerPromptShell";
import {
  ComposerCommandMenu,
  type ComposerCommandItem,
} from "~/components/chat/ComposerCommandMenu";
import { ProviderModelPicker } from "~/components/chat/ProviderModelPicker";
import { getComposerProviderState } from "~/components/chat/composerProviderState";
import { useAutoDsmCreateComponent } from "~/hooks/useAutoDsmCreateComponent";
import { useAutoDsmWorkspace } from "~/hooks/useAutoDsmWorkspace";
import { useBrandTokenComposerMenu } from "~/hooks/useBrandTokenComposerMenu";
import { getCustomModelOptionsByInstance, resolveAppModelSelectionState } from "~/modelSelection";
import { useSettings, useUpdateSettings } from "~/hooks/useSettings";
import { autodsmBrandProfileQueryOptions } from "~/lib/autodsmWorkspaceReactQuery";
import { cn } from "~/lib/utils";
import type { ProviderDriverKind } from "@t3tools/contracts";
import { createModelSelection } from "@t3tools/shared/model";
import { deriveProviderInstanceEntries } from "~/providerInstances";
import { useServerProviders } from "~/rpc/serverState";

const SUGGESTED_PROMPTS = [
  "Create a primary button with hover and disabled states",
  "Build a card component with image, title, and description",
  "Design a form input with validation and error states",
] as const;

const CREATE_COMPONENT_PROJECT_ACCENT_CLASS = "text-[#8a38f5]";

export function applyCreateComponentSuggestedPrompt(
  text: string,
  editorRef: RefObject<ComposerPromptEditorHandle | null>,
  setPrompt: (value: string) => void,
  setCursor: (value: number) => void,
): void {
  setPrompt(text);
  setCursor(text.length);
  window.requestAnimationFrame(() => {
    editorRef.current?.focusAtEnd();
  });
}

export function AutoDsmCreateComponentWorkspace(): JSX.Element {
  const { projectName, cwd, environmentId } = useAutoDsmWorkspace();
  const { isSubmitting, submitCreateComponent } = useAutoDsmCreateComponent();
  const settings = useSettings();
  const { updateSettings } = useUpdateSettings();
  const providers = useServerProviders();
  const [prompt, setPrompt] = useState("");
  const [cursor, setCursor] = useState(0);
  const editorRef = useRef<ComposerPromptEditorHandle>(null);
  const brandProfileQuery = useQuery(
    autodsmBrandProfileQueryOptions({
      environmentId,
      cwd,
      enabled: Boolean(cwd && environmentId),
    }),
  );
  const brandTokens = brandProfileQuery.data?.tokens ?? [];
  const expandedCursor = useMemo(
    () => expandCollapsedComposerCursor(prompt, cursor),
    [cursor, prompt],
  );
  const brandTokenMenu = useBrandTokenComposerMenu({
    brandTokens,
    prompt,
    expandedCursor,
  });

  const modelSelection = useMemo(
    () => resolveAppModelSelectionState(settings, providers),
    [providers, settings],
  );
  const providerInstanceEntries = useMemo(
    () => deriveProviderInstanceEntries(providers),
    [providers],
  );
  const modelOptionsByInstance = useMemo(
    () => getCustomModelOptionsByInstance(settings, providers),
    [providers, settings],
  );
  const activeInstanceEntry = useMemo(
    () =>
      providerInstanceEntries.find((entry) => entry.instanceId === modelSelection.instanceId) ??
      providerInstanceEntries.find((entry) => entry.enabled && entry.isAvailable) ??
      null,
    [modelSelection.instanceId, providerInstanceEntries],
  );
  const composerProviderState = useMemo(() => {
    if (!activeInstanceEntry) {
      return getComposerProviderState({
        provider: "codex" as ProviderDriverKind,
        model: modelSelection.model,
        models: [],
        prompt,
        modelOptions: modelSelection.options,
      });
    }
    return getComposerProviderState({
      provider: activeInstanceEntry.driverKind,
      model: modelSelection.model,
      models: activeInstanceEntry.models,
      prompt,
      modelOptions: modelSelection.options,
    });
  }, [activeInstanceEntry, modelSelection.model, modelSelection.options, prompt]);

  const canSend = prompt.trim().length > 0 && !isSubmitting && Boolean(cwd && environmentId);

  const handleSubmit = useCallback(async () => {
    if (!canSend) {
      return;
    }
    await submitCreateComponent(prompt);
  }, [canSend, prompt, submitCreateComponent]);

  const handleSuggestedPrompt = useCallback((text: string) => {
    applyCreateComponentSuggestedPrompt(text, editorRef, setPrompt, setCursor);
  }, []);

  const applyBrandTokenSelection = useCallback(
    (item: ComposerCommandItem) => {
      if (item.type !== "brand-token" || !brandTokenMenu.trigger) {
        return;
      }
      const replacement = `@${item.tokenName} `;
      const next = replaceTextRange(
        prompt,
        brandTokenMenu.trigger.rangeStart,
        brandTokenMenu.trigger.rangeEnd,
        replacement,
      );
      setPrompt(next.text);
      setCursor(next.cursor);
      brandTokenMenu.setHighlightedItemId(null);
      window.requestAnimationFrame(() => {
        editorRef.current?.focusAt(next.cursor);
      });
    },
    [brandTokenMenu, prompt],
  );

  if (!cwd || !environmentId) {
    return (
      <div className="w-full max-w-[552px] rounded-3xl border border-dashed border-[#2c2c2e] bg-[#1c1c1e]/40 px-6 py-10 text-sm text-[#a1a1a6]">
        Open a project from Home to create components in this workspace.
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-[552px] flex-col items-center gap-6">
      <h1 className="text-center text-2xl font-extrabold leading-9 tracking-tight text-white">
        Build a component for{" "}
        <span className={CREATE_COMPONENT_PROJECT_ACCENT_CLASS}>
          {projectName ?? "your workspace"}
        </span>
      </h1>

      <div className="flex w-full flex-col gap-4">
        <form
          className="w-full"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSubmit();
          }}
        >
          <ComposerPromptShell
            className="max-w-none"
            {...(composerProviderState.composerFrameClassName
              ? { frameClassName: composerProviderState.composerFrameClassName }
              : {})}
            {...(composerProviderState.composerSurfaceClassName
              ? { surfaceClassName: composerProviderState.composerSurfaceClassName }
              : {})}
            footer={
              <>
                <div className="-m-1 flex min-w-0 flex-1 items-center gap-1 overflow-x-auto p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <ProviderModelPicker
                    compact
                    activeInstanceId={modelSelection.instanceId}
                    model={modelSelection.model}
                    lockedProvider={null}
                    instanceEntries={providerInstanceEntries}
                    modelOptionsByInstance={modelOptionsByInstance}
                    {...(composerProviderState.modelPickerIconClassName
                      ? {
                          activeProviderIconClassName:
                            composerProviderState.modelPickerIconClassName,
                        }
                      : {})}
                    onInstanceModelChange={(instanceId, model) => {
                      updateSettings({
                        textGenerationModelSelection: resolveAppModelSelectionState(
                          {
                            ...settings,
                            textGenerationModelSelection: createModelSelection(instanceId, model),
                          },
                          providers,
                        ),
                      });
                    }}
                  />
                </div>
                <button
                  aria-label="Create component"
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/90 text-primary-foreground",
                    "transition-all duration-150 hover:scale-105 hover:bg-primary",
                    "disabled:pointer-events-none disabled:opacity-30 disabled:hover:scale-100",
                  )}
                  disabled={!canSend}
                  type="submit"
                >
                  <ArrowUpIcon className="size-4" />
                </button>
              </>
            }
          >
            <div className="relative min-h-[72px] px-3 pb-2 pt-3.5 sm:px-4 sm:pt-4">
              {brandTokenMenu.menuOpen ? (
                <div className="absolute inset-x-0 bottom-full z-20 mb-2 px-1">
                  <ComposerCommandMenu
                    items={[...brandTokenMenu.menuItems]}
                    resolvedTheme="dark"
                    isLoading={false}
                    triggerKind="brand-token"
                    activeItemId={brandTokenMenu.activeMenuItem?.id ?? null}
                    onHighlightedItemChange={brandTokenMenu.setHighlightedItemId}
                    onSelect={applyBrandTokenSelection}
                  />
                </div>
              ) : null}
              <ComposerPromptEditor
                editorRef={editorRef}
                value={prompt}
                cursor={cursor}
                terminalContexts={[]}
                skills={[]}
                brandTokens={brandTokens}
                disableBrandTokenTypeahead={brandTokenMenu.brandTokenMode}
                onRemoveTerminalContext={() => {}}
                onChange={(nextValue, nextCursor) => {
                  setPrompt(nextValue);
                  setCursor(nextCursor);
                }}
                placeholder="What would you like your component to be? Type @ for design tokens."
                disabled={isSubmitting}
                onCommandKeyDown={(key, event) => {
                  if (brandTokenMenu.menuOpen) {
                    if (key === "ArrowDown" && brandTokenMenu.menuItems.length > 0) {
                      brandTokenMenu.nudgeHighlight("ArrowDown");
                      return true;
                    }
                    if (key === "ArrowUp" && brandTokenMenu.menuItems.length > 0) {
                      brandTokenMenu.nudgeHighlight("ArrowUp");
                      return true;
                    }
                    if (
                      key === "Enter" &&
                      !event.shiftKey &&
                      brandTokenMenu.activeMenuItem !== null
                    ) {
                      applyBrandTokenSelection(brandTokenMenu.activeMenuItem);
                      return true;
                    }
                  }
                  if (key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void handleSubmit();
                    return true;
                  }
                  return false;
                }}
                onPaste={() => {}}
              />
            </div>
          </ComposerPromptShell>
        </form>

        <div className="flex w-full flex-col">
          {SUGGESTED_PROMPTS.map((text) => (
            <button
              className={cn(
                "flex w-full items-center gap-4 rounded-xl px-4 py-3 text-left transition-colors",
                "text-[#a1a1a6] hover:bg-white/3 hover:text-[#d1d1d6]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8a38f5]/40",
              )}
              disabled={isSubmitting}
              key={text}
              onClick={() => {
                handleSuggestedPrompt(text);
              }}
              type="button"
            >
              <span className="flex shrink-0 items-center rounded-xl bg-[#2c2c2e] p-2">
                <CornerUpRightIcon aria-hidden className="size-4 text-white/80" />
              </span>
              <span className="text-base leading-6">{text}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
