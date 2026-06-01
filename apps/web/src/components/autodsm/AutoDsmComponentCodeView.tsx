"use client";

import {
  type DiffsHighlighter,
  getSharedHighlighter,
  type SupportedLanguages,
} from "@pierre/diffs";
import type { EnvironmentId } from "@t3tools/contracts";
import { useQuery } from "@tanstack/react-query";
import { CheckIcon, CopyIcon } from "lucide-react";
import type { JSX } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import { ComponentPreviewLoadingSkeleton } from "~/components/ComponentPreviewLoadingSkeleton";
import { ensureEnvironmentApi } from "~/environmentApi";
import { useTheme } from "~/hooks/useTheme";
import { resolveDiffThemeName } from "~/lib/diffRendering";
import { cn } from "~/lib/utils";

export interface AutoDsmComponentCodeViewProps {
  readonly relativePath: string;
  readonly environmentId: EnvironmentId;
  readonly workspaceCwd: string;
  readonly className?: string;
}

const LINE_NUMBER_STYLE = `
.autodsm-code-view .shiki { margin: 0; background: transparent !important; }
.autodsm-code-view .shiki code { counter-reset: line; display: block; }
.autodsm-code-view .shiki code .line::before {
  counter-increment: line;
  content: counter(line);
  display: inline-block;
  width: 2.5rem;
  margin-right: 1.25rem;
  text-align: right;
  color: var(--muted-foreground);
  opacity: 0.55;
  user-select: none;
}
`;

function languageFromPath(relativePath: string): SupportedLanguages {
  const lower = relativePath.toLowerCase();
  if (lower.endsWith(".tsx")) return "tsx" as SupportedLanguages;
  if (lower.endsWith(".ts")) return "typescript" as SupportedLanguages;
  if (lower.endsWith(".jsx")) return "jsx" as SupportedLanguages;
  if (lower.endsWith(".js") || lower.endsWith(".mjs") || lower.endsWith(".cjs"))
    return "javascript" as SupportedLanguages;
  if (lower.endsWith(".css")) return "css" as SupportedLanguages;
  if (lower.endsWith(".json")) return "json" as SupportedLanguages;
  if (lower.endsWith(".md") || lower.endsWith(".mdx")) return "markdown" as SupportedLanguages;
  return "text" as SupportedLanguages;
}

const highlighterCache = new Map<string, Promise<DiffsHighlighter>>();

function highlighterFor(language: SupportedLanguages): Promise<DiffsHighlighter> {
  const key = String(language);
  const cached = highlighterCache.get(key);
  if (cached) return cached;
  const promise = getSharedHighlighter({
    themes: [resolveDiffThemeName("dark"), resolveDiffThemeName("light")],
    langs: [language],
    preferredHighlighter: "shiki-js",
  }).catch((err: unknown) => {
    highlighterCache.delete(key);
    if (key === "text") throw err;
    return highlighterFor("text" as SupportedLanguages);
  });
  highlighterCache.set(key, promise);
  return promise;
}

function basename(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, "/");
  return normalized.split("/").pop() ?? relativePath;
}

export function AutoDsmComponentCodeView(props: AutoDsmComponentCodeViewProps): JSX.Element {
  const { relativePath, environmentId, workspaceCwd, className } = props;
  const { resolvedTheme } = useTheme();

  const fileQuery = useQuery({
    queryKey: ["autodsm", "component-source", environmentId, workspaceCwd, relativePath],
    staleTime: 5_000,
    queryFn: async () => {
      const api = ensureEnvironmentApi(environmentId);
      return api.projects.readFile({ cwd: workspaceCwd, relativePath });
    },
  });

  const source = fileQuery.data?.contents ?? "";
  const language = languageFromPath(relativePath);

  const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null);

  useEffect(() => {
    if (!fileQuery.data) {
      setHighlightedHtml(null);
      return;
    }
    let cancelled = false;
    const themeName = resolveDiffThemeName(resolvedTheme);
    void highlighterFor(language)
      .then((highlighter) => {
        if (cancelled) return;
        try {
          setHighlightedHtml(highlighter.codeToHtml(source, { lang: language, theme: themeName }));
        } catch {
          setHighlightedHtml(
            highlighter.codeToHtml(source, {
              lang: "text" as SupportedLanguages,
              theme: themeName,
            }),
          );
        }
      })
      .catch(() => {
        if (!cancelled) setHighlightedHtml(null);
      });
    return () => {
      cancelled = true;
    };
  }, [fileQuery.data, source, language, resolvedTheme]);

  const [copied, setCopied] = useState(false);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleCopy = useCallback(() => {
    if (typeof navigator === "undefined" || navigator.clipboard == null) return;
    void navigator.clipboard.writeText(source).then(() => {
      if (copiedTimerRef.current != null) clearTimeout(copiedTimerRef.current);
      setCopied(true);
      copiedTimerRef.current = setTimeout(() => setCopied(false), 1500);
    });
  }, [source]);

  useEffect(
    () => () => {
      if (copiedTimerRef.current != null) clearTimeout(copiedTimerRef.current);
    },
    [],
  );

  if (fileQuery.isPending) {
    return <ComponentPreviewLoadingSkeleton className="min-h-0 flex-1" />;
  }

  if (fileQuery.isError) {
    return (
      <div className={cn("p-4 text-destructive text-xs", className)}>
        {(fileQuery.error as Error)?.message ?? "Failed to read component source."}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "autodsm-code-view flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden text-foreground",
        className,
      )}
      data-testid="autodsm-component-code-view"
    >
      <style>{LINE_NUMBER_STYLE}</style>
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
        <span className="truncate font-mono text-muted-foreground text-xs">
          {basename(relativePath)}
          {fileQuery.data?.truncated ? " (truncated at 512 KiB)" : ""}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 rounded-md border border-border/60 px-2 py-1 text-muted-foreground text-xs transition-colors hover:text-foreground"
          aria-label="Copy source"
        >
          {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-3 font-mono text-xs leading-relaxed">
        {highlightedHtml ? (
          // eslint-disable-next-line react/no-danger
          <div dangerouslySetInnerHTML={{ __html: highlightedHtml }} />
        ) : (
          <pre className="whitespace-pre">{source}</pre>
        )}
      </div>
    </div>
  );
}
