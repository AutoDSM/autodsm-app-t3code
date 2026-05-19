import { normalizeSidebarComponentCatalogPath } from "~/lib/srcComponentsWorkspacePaths";

export interface CreateComponentMetadata {
  readonly title: string;
  readonly componentFileName: string;
  readonly componentPath: string;
}

const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "with",
  "and",
  "or",
  "for",
  "that",
  "your",
  "component",
  "components",
  "please",
  "make",
  "create",
  "build",
  "design",
]);

function toPascalCase(words: readonly string[]): string {
  return words
    .filter((word) => word.length > 0 && !STOP_WORDS.has(word.toLowerCase()))
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("");
}

function toDisplayTitle(pascalName: string): string {
  return pascalName.replace(/([a-z0-9])([A-Z])/g, "$1 $2").trim();
}

function extractSubjectFromPrompt(prompt: string): string {
  const trimmed = prompt.trim();
  const match = trimmed.match(/(?:create|build|design|make)\s+(?:a|an)?\s*([^?.!]+)/i);
  if (match?.[1]) {
    return match[1].trim();
  }
  return trimmed.slice(0, 120);
}

function wordsFromSubject(subject: string): string[] {
  return subject
    .replace(/[^a-zA-Z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function trimSubjectClauses(subject: string): string {
  return subject.split(/\b(with|that|for|including|featuring)\b/i)[0]?.trim() ?? subject;
}

export function inferComponentBaseName(prompt: string): string {
  const subject = trimSubjectClauses(extractSubjectFromPrompt(prompt));
  const words = wordsFromSubject(subject);
  const meaningful = words.filter((word) => !STOP_WORDS.has(word.toLowerCase()));
  const selected = meaningful.slice(0, 2);
  const pascal = toPascalCase(selected.length > 0 ? selected : meaningful.slice(0, 3));
  return pascal.length > 0 ? pascal : "NewComponent";
}

export function resolveUniqueComponentPath(
  baseName: string,
  existingPaths: readonly string[],
): Pick<CreateComponentMetadata, "componentFileName" | "componentPath"> {
  const normalizedExisting = new Set(
    existingPaths.map((path) => normalizeSidebarComponentCatalogPath(path)),
  );
  const stem = baseName.replace(/\.tsx$/i, "").trim() || "NewComponent";

  for (let attempt = 0; attempt < 1000; attempt += 1) {
    const candidateStem = attempt === 0 ? stem : `${stem}${attempt + 1}`;
    const componentFileName = `${candidateStem}.tsx`;
    const componentPath = normalizeSidebarComponentCatalogPath(
      `src/components/${componentFileName}`,
    );
    if (!normalizedExisting.has(componentPath)) {
      return { componentFileName, componentPath };
    }
  }

  const fallbackStem = `${stem}${Date.now()}`;
  const componentFileName = `${fallbackStem}.tsx`;
  return {
    componentFileName,
    componentPath: normalizeSidebarComponentCatalogPath(`src/components/${componentFileName}`),
  };
}

export function inferCreateComponentMetadata(
  prompt: string,
  existingPaths: readonly string[],
): CreateComponentMetadata {
  const baseName = inferComponentBaseName(prompt);
  const { componentFileName, componentPath } = resolveUniqueComponentPath(baseName, existingPaths);
  const stem = componentFileName.replace(/\.tsx$/i, "");
  return {
    title: toDisplayTitle(stem),
    componentFileName,
    componentPath,
  };
}
