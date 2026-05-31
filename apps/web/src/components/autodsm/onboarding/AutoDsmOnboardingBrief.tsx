"use client";

import type { ChangeEvent, DragEvent, JSX } from "react";
import { useRef, useState } from "react";

import { useNavigate } from "@tanstack/react-router";
import { FileTextIcon, UploadCloudIcon } from "lucide-react";

import { cn } from "~/lib/utils";
import { useUiStateStore } from "~/uiStateStore";

import { AutoDsmLogoMark } from "../AutoDsmLogoMark";
import { AutoDsmOnboardingShell } from "./AutoDsmOnboardingShell";

const MAX_BYTES = 131_072;

/**
 * Shared landing page for the optional `design.md` upload step. Both the
 * "Build from scratch" and "Start from a library" onboarding flows route here
 * after the user has picked a starter.
 *
 * The workspace cwd does NOT exist yet at this point — the workspace is
 * materialized on `/onboarding/loading`, which comes next. So this page
 * captures the markdown text into `uiStateStore.pendingDesignBriefMarkdown`
 * and the Design Tokens workspace consumes it after the user lands there
 * (uploads to `.autodsm/design-brief.md`, proposes, opens the review modal).
 *
 * Skipping (or continuing with empty text) just clears the pending brief —
 * onboarding completes either way.
 */
export function AutoDsmOnboardingBrief(): JSX.Element {
  const navigate = useNavigate();
  const patchOnboarding = useUiStateStore((s) => s.patchAutodsmOnboarding);
  const setPendingBrief = useUiStateStore((s) => s.setPendingDesignBriefMarkdown);
  const initialBrief = useUiStateStore((s) => s.pendingDesignBriefMarkdown);

  const [markdown, setMarkdown] = useState<string>(initialBrief ?? "");
  const [filename, setFilename] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const byteLength = new Blob([markdown]).size;
  const overSize = byteLength > MAX_BYTES;
  const hasContent = markdown.trim().length > 0;

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

  const skipAndAdvance = (): void => {
    setPendingBrief(null);
    void navigate({ to: "/onboarding/loading", replace: true });
  };

  const continueAndAdvance = (): void => {
    if (overSize) return;
    if (hasContent) {
      setPendingBrief(markdown);
      patchOnboarding({ briefUploaded: true });
    } else {
      setPendingBrief(null);
    }
    void navigate({ to: "/onboarding/loading", replace: true });
  };

  return (
    <AutoDsmOnboardingShell>
      <div className="flex flex-col gap-6">
        <AutoDsmLogoMark className="h-10 w-auto sm:h-11" />
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold text-foreground">
            Refine your design with a brand brief
          </h2>
          <p className="text-sm text-muted-foreground">
            Optionally upload a <code className="rounded bg-muted px-1 py-0.5">design.md</code>{" "}
            describing your aesthetic — palette, mood, typography, voice. We&apos;ll propose token
            changes you can review before applying. You can also do this later from the design
            tokens workspace.
          </p>
        </div>

        <div
          className={cn(
            "flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed",
            "px-6 py-7 text-center transition-colors",
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
          <p className="text-sm font-medium text-foreground">
            Drop a <code className="rounded bg-muted px-1 py-0.5">.md</code> file, or{" "}
            <button
              className="font-semibold text-primary hover:underline focus-visible:underline focus-visible:outline-none"
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              choose a file
            </button>
            .
          </p>
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
              "min-h-[160px] w-full resize-y rounded-xl border border-border/60 bg-card/35 px-3 py-2 text-sm",
              "font-mono leading-relaxed text-foreground placeholder:text-muted-foreground/60",
              "outline-none transition-colors focus:border-primary/60 focus:bg-card/55",
              "focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            )}
            onChange={(e) => {
              setMarkdown(e.target.value);
              setFilename(null);
            }}
            placeholder="Warm and earthy. Terracotta primary, cream surfaces. Inter for UI, Fraunces for display. Generous radii, soft shadows."
            spellCheck={false}
            value={markdown}
          />
        </div>

        {error ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          <button
            className={cn(
              "h-12 w-full rounded-xl bg-primary font-semibold text-primary-foreground shadow-sm",
              "outline-none transition-colors hover:bg-primary/90",
              "focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              "disabled:cursor-not-allowed disabled:opacity-40",
            )}
            disabled={overSize}
            onClick={continueAndAdvance}
            type="button"
          >
            {hasContent ? "Save brief and continue" : "Continue"}
          </button>
          <button
            className={cn(
              "h-11 w-full rounded-xl bg-transparent text-sm font-medium text-muted-foreground",
              "outline-none transition-colors hover:text-foreground",
              "focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            )}
            onClick={skipAndAdvance}
            type="button"
          >
            Skip — I&apos;ll do this later
          </button>
        </div>
      </div>
    </AutoDsmOnboardingShell>
  );
}
