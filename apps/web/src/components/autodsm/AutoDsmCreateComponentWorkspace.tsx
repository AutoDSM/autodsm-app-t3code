"use client";

import {
  ArrowUpIcon,
  MousePointerClickIcon,
  RectangleHorizontalIcon,
  TextCursorInputIcon,
} from "lucide-react";
import { useCallback, useMemo, useRef, useState, type JSX } from "react";

import {
  ComposerPromptEditor,
  type ComposerPromptEditorHandle,
} from "~/components/ComposerPromptEditor";
import { ComposerPromptShell } from "~/components/chat/ComposerPromptShell";
import { ProviderModelPicker } from "~/components/chat/ProviderModelPicker";
import { getComposerProviderState } from "~/components/chat/composerProviderState";
import { useAutoDsmCreateComponent } from "~/hooks/useAutoDsmCreateComponent";
import { useAutoDsmWorkspace } from "~/hooks/useAutoDsmWorkspace";
import { getCustomModelOptionsByInstance, resolveAppModelSelectionState } from "~/modelSelection";
import { useSettings, useUpdateSettings } from "~/hooks/useSettings";
import { cn } from "~/lib/utils";
import type { ProviderDriverKind } from "@t3tools/contracts";
import { createModelSelection } from "@t3tools/shared/model";
import { deriveProviderInstanceEntries } from "~/providerInstances";
import { useServerProviders } from "~/rpc/serverState";

const SUGGESTED_PROMPTS = [
  {
    icon: MousePointerClickIcon,
    text: "Create a primary button with hover and disabled states",
  },
  {
    icon: RectangleHorizontalIcon,
    text: "Build a card component with image, title, and description",
  },
  {
    icon: TextCursorInputIcon,
    text: "Design a form input with validation and error states",
  },
] as const;

export function AutoDsmCreateComponentWorkspace(): JSX.Element {
  const { projectName, cwd, environmentId } = useAutoDsmWorkspace();
  const { isSubmitting, submitCreateComponent } = useAutoDsmCreateComponent();
  const settings = useSettings();
  const { updateSettings } = useUpdateSettings();
  const providers = useServerProviders();
  const [prompt, setPrompt] = useState("");
  const [cursor, setCursor] = useState(0);
  const editorRef = useRef<ComposerPromptEditorHandle>(null);

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
    setPrompt(text);
    editorRef.current?.focus();
  }, []);

  if (!cwd || !environmentId) {
    return (
      <div className="rounded-2xl border border-dashed border-border/70 bg-muted/5 px-6 py-10 text-sm text-muted-foreground">
        Open a project from Home to create components in this workspace.
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col gap-8">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.65rem]">
          Build a component for{" "}
          <span className="text-violet-400">{projectName ?? "your workspace"}</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Describe what you want. AutoDSM starts a scoped agent run and opens the preview when the
          file lands on disk.
        </p>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
      >
        <ComposerPromptShell
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
                        activeProviderIconClassName: composerProviderState.modelPickerIconClassName,
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
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/90 text-primary-foreground transition-all duration-150 hover:scale-105 hover:bg-primary disabled:pointer-events-none disabled:opacity-30 disabled:hover:scale-100"
                disabled={!canSend}
                type="submit"
              >
                <ArrowUpIcon className="size-4" />
              </button>
            </>
          }
        >
          <div className="px-3 pt-3 sm:px-4 sm:pt-4">
            <ComposerPromptEditor
              editorRef={editorRef}
              value={prompt}
              cursor={cursor}
              terminalContexts={[]}
              skills={[]}
              onRemoveTerminalContext={() => {}}
              onChange={(nextValue, nextCursor) => {
                setPrompt(nextValue);
                setCursor(nextCursor);
              }}
              placeholder="What would you like your component to be?"
              disabled={isSubmitting}
              onCommandKeyDown={(key, event) => {
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

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Suggested prompts
        </p>
        <div className="flex flex-col gap-2">
          {SUGGESTED_PROMPTS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={cn(
                  "flex items-center gap-3 rounded-xl border border-border/60 bg-card/20 px-3 py-3 text-left text-sm text-muted-foreground transition-colors",
                  "hover:border-border hover:bg-card/40 hover:text-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                )}
                disabled={isSubmitting}
                key={item.text}
                onClick={() => {
                  handleSuggestedPrompt(item.text);
                }}
                type="button"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/30 text-foreground/80">
                  <Icon className="size-4" />
                </span>
                <span>{item.text}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
