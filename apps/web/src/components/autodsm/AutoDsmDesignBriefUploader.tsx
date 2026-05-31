"use client";

import type { ChangeEvent, DragEvent, JSX } from "react";
import { useEffect, useRef, useState } from "react";

import type { AutoDsmDesignBriefProposal, ModelSelection } from "@t3tools/contracts";
import { FileTextIcon, UploadCloudIcon } from "lucide-react";

import {
  autodsmGetDesignBrief,
  autodsmProposeDesignBrief,
  autodsmUploadDesignBrief,
} from "~/lib/autodsmWorkspaceReactQuery";
import { cn } from "~/lib/utils";

import type { EnvironmentId } from "@t3tools/contracts";

const MAX_BYTES = 131_072;

export interface AutoDsmDesignBriefUploaderProps {
  readonly environmentId: EnvironmentId;
  readonly cwd: string;
  /** Visual context — onboarding step vs. modal in the design tokens workspace. */
  readonly mode: "onboarding" | "workspace";
  /** Called when a proposal has been successfully generated. */
  readonly onProposalReady: (proposal: AutoDsmDesignBriefProposal) => void;
  /** Optional override for the "Analyze brief" CTA label. */
  readonly submitLabel?: string;
  /** Active provider/model the user has selected for text generation. */
  readonly modelSelection: ModelSelection;
  /** Short, human-readable name of the active model — surfaced in the loading copy. */
  readonly modelLabel?: string;
}

/**
 * Single component that bundles four things into one flow:
 *  1. File picker / drag-and-drop for `.md` files (≤ 32 KB).
 *  2. Paste-as-text textarea fallback (for users whose brief lives in another tool).
 *  3. "Reuse saved brief" path when a brief is already persisted on disk.
 *  4. Two-step submit: upload → propose, then hand the proposal up via `onProposalReady`.
 *
 * Everything stays self-contained so the same component slots into the
 * `/onboarding/brief` page and the post-onboarding workspace modal.
 */
export function AutoDsmDesignBriefUploader(props: AutoDsmDesignBriefUploaderProps): JSX.Element {
  const { environmentId, cwd, mode, onProposalReady, submitLabel, modelSelection, modelLabel } =
    props;
  const [markdown, setMarkdown] = useState("");
  const [filename, setFilename] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSavedBrief, setHasSavedBrief] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load any existing brief on mount so the user can "Reuse saved brief".
  useEffect(() => {
    let cancelled = false;
    autodsmGetDesignBrief({ environmentId, cwd })
      .then((result) => {
        if (cancelled) return;
        if (result.markdown && result.markdown.trim().length > 0) {
          setMarkdown(result.markdown);
          setHasSavedBrief(true);
        }
      })
      .catch(() => {
        // No saved brief is the common case — silently ignore.
      });
    return () => {
      cancelled = true;
    };
  }, [environmentId, cwd]);

  const byteLength = new Blob([markdown]).size;
  const overSize = byteLength > MAX_BYTES;
  const hasContent = markdown.trim().length > 0;
  const canSubmit = hasContent && !overSize && !isSubmitting;

  const readFile = (file: File): void => {
    setError(null);
    if (file.size > MAX_BYTES) {
      setError(`File is too large (${file.size} bytes; max ${MAX_BYTES}).`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      setMarkdown(text);
      setFilename(file.name);
    };
    reader.onerror = () => {
      setError("Could not read file.");
    };
    reader.readAsText(file);
  };

  const onFileChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (file) readFile(file);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) readFile(file);
  };

  const onSubmit = async (): Promise<void> => {
    if (!canSubmit) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await autodsmUploadDesignBrief({ environmentId, cwd, markdown });
      const { proposal } = await autodsmProposeDesignBrief({
        environmentId,
        cwd,
        modelSelection,
      });
      onProposalReady(proposal);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Failed to analyze brief.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed",
          "px-6 py-8 text-center transition-colors",
          isDragging
            ? "border-primary/70 bg-primary/10"
            : "border-border/60 bg-card/35 hover:bg-card/55",
        )}
        onDragEnter={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragging(false);
        }}
        onDragOver={(e) => {
          e.preventDefault();
        }}
        onDrop={onDrop}
      >
        <UploadCloudIcon aria-hidden className="size-7 text-muted-foreground" strokeWidth={1.5} />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-foreground">
            Drop a <code className="rounded bg-muted px-1 py-0.5">design.md</code> file, or{" "}
            <button
              className="font-semibold text-primary hover:underline focus-visible:underline focus-visible:outline-none"
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              choose a file
            </button>
            .
          </p>
          <p className="text-xs text-muted-foreground">
            Markdown only · up to 128&nbsp;KB. Describe your brand, palette, type, mood — natural
            language is fine.
          </p>
        </div>
        <input
          accept=".md,text/markdown"
          className="hidden"
          onChange={onFileChange}
          ref={fileInputRef}
          type="file"
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <FileTextIcon aria-hidden className="size-3.5" strokeWidth={1.5} />
            {filename ? (
              <span className="font-medium text-foreground">{filename}</span>
            ) : hasSavedBrief && markdown.length > 0 ? (
              <span>
                Loaded from saved <code className="rounded bg-muted px-1">design-brief.md</code>
              </span>
            ) : (
              <span>Or paste your brief below</span>
            )}
          </span>
          <span className={overSize ? "text-destructive" : undefined}>
            {byteLength.toLocaleString()} / {MAX_BYTES.toLocaleString()} bytes
          </span>
        </div>
        <textarea
          className={cn(
            "min-h-[180px] w-full resize-y rounded-xl border border-border/60 bg-card/35 px-3 py-2 text-sm",
            "font-mono leading-relaxed text-foreground placeholder:text-muted-foreground/60",
            "outline-none transition-colors focus:border-primary/60 focus:bg-card/55",
            "focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          )}
          onChange={(e) => {
            setMarkdown(e.target.value);
            setFilename(null);
          }}
          placeholder="# Brand brief&#10;&#10;Warm and earthy. Terracotta primary, cream surfaces. Inter for UI, Fraunces for display. Generous radii, soft shadows."
          spellCheck={false}
          value={markdown}
        />
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <button
        className={cn(
          "h-11 w-full rounded-xl bg-primary font-semibold text-primary-foreground shadow-sm",
          "outline-none transition-colors hover:bg-primary/90",
          "focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:cursor-not-allowed disabled:opacity-40",
        )}
        disabled={!canSubmit}
        onClick={() => {
          void onSubmit();
        }}
        type="button"
      >
        {isSubmitting
          ? modelLabel
            ? `Analyzing your brief with ${modelLabel}…`
            : "Analyzing your brief…"
          : (submitLabel ?? (mode === "onboarding" ? "Analyze brief" : "Generate proposal"))}
      </button>
    </div>
  );
}
