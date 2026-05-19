import {
  INLINE_TERMINAL_CONTEXT_PLACEHOLDER,
  type TerminalContextDraft,
} from "./lib/terminalContext";

export type ComposerPromptSegment =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "mention";
      path: string;
    }
  | {
      type: "brand-token";
      name: string;
    }
  | {
      type: "skill";
      name: string;
    }
  | {
      type: "terminal-context";
      context: TerminalContextDraft | null;
    };

export interface SplitPromptOptions {
  readonly brandTokenNames?: ReadonlySet<string>;
}

const MENTION_TOKEN_REGEX = /(^|\s)@([^\s@]+)(?=\s)/g;
const BRAND_TOKEN_REGEX = /(^|\s)@([a-zA-Z][a-zA-Z0-9-_]*)(?=\s|$|[.,!?;:])/g;
const SKILL_TOKEN_REGEX = /(^|\s)\$([a-zA-Z][a-zA-Z0-9:_-]*)(?=\s)/g;

function rangeIncludesIndex(start: number, end: number, index: number): boolean {
  return start <= index && index < end;
}

function pushTextSegment(segments: ComposerPromptSegment[], text: string): void {
  if (!text) return;
  const last = segments[segments.length - 1];
  if (last && last.type === "text") {
    last.text += text;
    return;
  }
  segments.push({ type: "text", text });
}

type InlineTokenMatch =
  | {
      type: "mention";
      value: string;
      start: number;
      end: number;
    }
  | {
      type: "brand-token";
      value: string;
      start: number;
      end: number;
    }
  | {
      type: "skill";
      value: string;
      start: number;
      end: number;
    };

function classifyMentionValue(
  value: string,
  brandTokenNames: ReadonlySet<string> | undefined,
): "mention" | "brand-token" {
  if (value.includes("/") || value.includes(".")) {
    return "mention";
  }
  if (brandTokenNames?.has(value.toLowerCase()) === true) {
    return "brand-token";
  }
  return "mention";
}

function collectInlineTokenMatches(
  text: string,
  brandTokenNames: ReadonlySet<string> | undefined,
): InlineTokenMatch[] {
  const matches: InlineTokenMatch[] = [];

  for (const match of text.matchAll(MENTION_TOKEN_REGEX)) {
    const fullMatch = match[0];
    const prefix = match[1] ?? "";
    const path = match[2] ?? "";
    const matchIndex = match.index ?? 0;
    const start = matchIndex + prefix.length;
    const end = start + fullMatch.length - prefix.length;
    if (path.length > 0) {
      const kind = classifyMentionValue(path, brandTokenNames);
      matches.push({ type: kind, value: path, start, end });
    }
  }

  for (const match of text.matchAll(BRAND_TOKEN_REGEX)) {
    const fullMatch = match[0];
    const prefix = match[1] ?? "";
    const name = match[2] ?? "";
    const matchIndex = match.index ?? 0;
    const start = matchIndex + prefix.length;
    const end = start + fullMatch.length - prefix.length;
    if (name.length === 0) {
      continue;
    }
    if (classifyMentionValue(name, brandTokenNames) !== "brand-token") {
      continue;
    }
    if (matches.some((existing) => existing.start === start && existing.end === end)) {
      continue;
    }
    matches.push({ type: "brand-token", value: name, start, end });
  }

  for (const match of text.matchAll(SKILL_TOKEN_REGEX)) {
    const fullMatch = match[0];
    const prefix = match[1] ?? "";
    const skillName = match[2] ?? "";
    const matchIndex = match.index ?? 0;
    const start = matchIndex + prefix.length;
    const end = start + fullMatch.length - prefix.length;
    if (skillName.length > 0) {
      matches.push({ type: "skill", value: skillName, start, end });
    }
  }

  return matches.toSorted((left, right) => left.start - right.start);
}

function forEachPromptSegmentSlice(
  prompt: string,
  visitor: (
    slice:
      | {
          type: "text";
          text: string;
          promptOffset: number;
        }
      | {
          type: "terminal-context";
          promptOffset: number;
        },
  ) => boolean | void,
): boolean {
  let textCursor = 0;

  for (let index = 0; index < prompt.length; index += 1) {
    if (prompt[index] !== INLINE_TERMINAL_CONTEXT_PLACEHOLDER) {
      continue;
    }

    if (
      index > textCursor &&
      visitor({
        type: "text",
        text: prompt.slice(textCursor, index),
        promptOffset: textCursor,
      }) === true
    ) {
      return true;
    }
    if (visitor({ type: "terminal-context", promptOffset: index }) === true) {
      return true;
    }
    textCursor = index + 1;
  }

  if (
    textCursor < prompt.length &&
    visitor({
      type: "text",
      text: prompt.slice(textCursor),
      promptOffset: textCursor,
    }) === true
  ) {
    return true;
  }

  return false;
}

function forEachPromptTextSlice(
  prompt: string,
  visitor: (text: string, promptOffset: number) => boolean | void,
): boolean {
  return forEachPromptSegmentSlice(prompt, (slice) => {
    if (slice.type !== "text") {
      return false;
    }
    return visitor(slice.text, slice.promptOffset);
  });
}

function forEachMentionMatch(
  prompt: string,
  visitor: (match: RegExpMatchArray, promptOffset: number) => boolean | void,
): boolean {
  return forEachPromptTextSlice(prompt, (text, promptOffset) => {
    for (const match of text.matchAll(MENTION_TOKEN_REGEX)) {
      if (visitor(match, promptOffset) === true) {
        return true;
      }
    }
    for (const match of text.matchAll(BRAND_TOKEN_REGEX)) {
      if (visitor(match, promptOffset) === true) {
        return true;
      }
    }
    return false;
  });
}

function splitPromptTextIntoComposerSegments(
  text: string,
  brandTokenNames: ReadonlySet<string> | undefined,
): ComposerPromptSegment[] {
  const segments: ComposerPromptSegment[] = [];
  if (!text) {
    return segments;
  }

  const tokenMatches = collectInlineTokenMatches(text, brandTokenNames);
  let cursor = 0;
  for (const match of tokenMatches) {
    if (match.start < cursor) {
      continue;
    }

    if (match.start > cursor) {
      pushTextSegment(segments, text.slice(cursor, match.start));
    }

    if (match.type === "mention") {
      segments.push({ type: "mention", path: match.value });
    } else if (match.type === "brand-token") {
      segments.push({ type: "brand-token", name: match.value });
    } else {
      segments.push({ type: "skill", name: match.value });
    }

    cursor = match.end;
  }

  if (cursor < text.length) {
    pushTextSegment(segments, text.slice(cursor));
  }

  return segments;
}

export function selectionTouchesMentionBoundary(
  prompt: string,
  start: number,
  end: number,
): boolean {
  if (!prompt || start >= end) {
    return false;
  }

  return forEachMentionMatch(prompt, (match, promptOffset) => {
    const fullMatch = match[0];
    const prefix = match[1] ?? "";
    const matchIndex = match.index ?? 0;
    const mentionStart = promptOffset + matchIndex + prefix.length;
    const mentionEnd = mentionStart + fullMatch.length - prefix.length;
    const beforeMentionIndex = mentionStart - 1;
    const afterMentionIndex = mentionEnd;

    if (
      beforeMentionIndex >= 0 &&
      /\s/.test(prompt[beforeMentionIndex] ?? "") &&
      rangeIncludesIndex(start, end, beforeMentionIndex)
    ) {
      return true;
    }

    if (
      afterMentionIndex < prompt.length &&
      /\s/.test(prompt[afterMentionIndex] ?? "") &&
      rangeIncludesIndex(start, end, afterMentionIndex)
    ) {
      return true;
    }
    return false;
  });
}

export function splitPromptIntoComposerSegments(
  prompt: string,
  terminalContexts: ReadonlyArray<TerminalContextDraft> = [],
  options: SplitPromptOptions = {},
): ComposerPromptSegment[] {
  if (!prompt) {
    return [];
  }

  const segments: ComposerPromptSegment[] = [];
  let terminalContextIndex = 0;
  forEachPromptSegmentSlice(prompt, (slice) => {
    if (slice.type === "text") {
      segments.push(...splitPromptTextIntoComposerSegments(slice.text, options.brandTokenNames));
      return false;
    }

    segments.push({
      type: "terminal-context",
      context: terminalContexts[terminalContextIndex] ?? null,
    });
    terminalContextIndex += 1;
    return false;
  });

  return segments;
}

/** Active @query before the cursor for brand-token typeahead (without leading @). */
export function activeBrandTokenTypeaheadQuery(prompt: string, cursor: number): string | null {
  const before = prompt.slice(0, cursor);
  const match = /(?:^|\s)@([a-zA-Z][a-zA-Z0-9-_]*)$/.exec(before);
  return match?.[1] ?? null;
}
