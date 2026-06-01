import * as Schema from "effect/Schema";
import { PositiveInt, TrimmedNonEmptyString, TrimmedString } from "./baseSchemas.ts";

const PROJECT_SEARCH_ENTRIES_MAX_LIMIT = 800;
const PROJECT_WRITE_FILE_PATH_MAX_LENGTH = 512;
/** Cap text reads for previews and analysis (512 KiB). */
export const PROJECT_READ_FILE_MAX_BYTES = 524_288;

const ProjectSearchEntryPathSubstring = TrimmedNonEmptyString.check(Schema.isMaxLength(128)).check(
  Schema.isPattern(/^\/(?:(?!.*\/\/)(?!.*\.\.)(?!.*\\).)+$/),
);

/** Query may be empty when `entryPathSubstring` scopes results (catalog-style listing). */
const ProjectSearchEntriesQueryLine = TrimmedString.check(Schema.isMaxLength(256));

export const ProjectSearchEntriesInput = Schema.Struct({
  cwd: TrimmedNonEmptyString,
  query: ProjectSearchEntriesQueryLine,
  limit: PositiveInt.check(Schema.isLessThanOrEqualTo(PROJECT_SEARCH_ENTRIES_MAX_LIMIT)),
  /** When `"file"`, indexed directories are omitted before ranking—better for sidebar file lists (e.g. components). */
  entryKind: Schema.optional(Schema.Literal("file")),
  /** When set, entries must contain this substring in their lowercase relative path before ranking/scoring runs. */
  entryPathSubstring: Schema.optional(ProjectSearchEntryPathSubstring),
});
export type ProjectSearchEntriesInput = typeof ProjectSearchEntriesInput.Type;

const ProjectEntryKind = Schema.Literals(["file", "directory"]);

export const ProjectEntry = Schema.Struct({
  path: TrimmedNonEmptyString,
  kind: ProjectEntryKind,
  parentPath: Schema.optional(TrimmedNonEmptyString),
});
export type ProjectEntry = typeof ProjectEntry.Type;

export const ProjectSearchEntriesResult = Schema.Struct({
  entries: Schema.Array(ProjectEntry),
  truncated: Schema.Boolean,
});
export type ProjectSearchEntriesResult = typeof ProjectSearchEntriesResult.Type;

export class ProjectSearchEntriesError extends Schema.TaggedErrorClass<ProjectSearchEntriesError>()(
  "ProjectSearchEntriesError",
  {
    message: TrimmedNonEmptyString,
    cause: Schema.optional(Schema.Defect),
  },
) {}

export const ProjectWriteFileInput = Schema.Struct({
  cwd: TrimmedNonEmptyString,
  relativePath: TrimmedNonEmptyString.check(Schema.isMaxLength(PROJECT_WRITE_FILE_PATH_MAX_LENGTH)),
  contents: Schema.String,
});
export type ProjectWriteFileInput = typeof ProjectWriteFileInput.Type;

export const ProjectWriteFileResult = Schema.Struct({
  relativePath: TrimmedNonEmptyString,
});
export type ProjectWriteFileResult = typeof ProjectWriteFileResult.Type;

export class ProjectWriteFileError extends Schema.TaggedErrorClass<ProjectWriteFileError>()(
  "ProjectWriteFileError",
  {
    message: TrimmedNonEmptyString,
    cause: Schema.optional(Schema.Defect),
  },
) {}

export const ProjectReadFileInput = Schema.Struct({
  cwd: TrimmedNonEmptyString,
  relativePath: TrimmedNonEmptyString.check(Schema.isMaxLength(PROJECT_WRITE_FILE_PATH_MAX_LENGTH)),
});
export type ProjectReadFileInput = typeof ProjectReadFileInput.Type;

export const ProjectReadFileResult = Schema.Struct({
  relativePath: TrimmedNonEmptyString,
  contents: Schema.String,
  truncated: Schema.Boolean,
});
export type ProjectReadFileResult = typeof ProjectReadFileResult.Type;

export class ProjectReadFileError extends Schema.TaggedErrorClass<ProjectReadFileError>()(
  "ProjectReadFileError",
  {
    message: TrimmedNonEmptyString,
    cause: Schema.optional(Schema.Defect),
  },
) {}

export const ComponentPreviewExportKindSchema = Schema.Literals([
  "function",
  "forwardRef",
  "memo",
  "class",
  "unknown",
]);
export type ComponentPreviewExportKind = typeof ComponentPreviewExportKindSchema.Type;

export const ComponentPreviewExportSpec = Schema.Struct({
  name: TrimmedNonEmptyString,
  isDefault: Schema.Boolean,
  kind: ComponentPreviewExportKindSchema,
});
export type ComponentPreviewExportSpec = typeof ComponentPreviewExportSpec.Type;

export const ComponentPreviewPropKindSchema = Schema.Literals([
  "string",
  "number",
  "boolean",
  "enum",
  "literalUnion",
  "reactNode",
  "function",
  "object",
  "array",
  "unknown",
  "unsupported",
]);
export type ComponentPreviewPropKind = typeof ComponentPreviewPropKindSchema.Type;

export const ComponentPreviewPropSpec = Schema.Struct({
  name: TrimmedNonEmptyString,
  kind: ComponentPreviewPropKindSchema,
  optional: Schema.Boolean,
  /** Serialized JSON default when inferable. */
  defaultJson: Schema.optional(Schema.String),
  description: Schema.optional(TrimmedString),
  enumValues: Schema.optional(Schema.Array(Schema.String)),
  unsupportedReason: Schema.optional(TrimmedString),
});
export type ComponentPreviewPropSpec = typeof ComponentPreviewPropSpec.Type;

export const ComponentPreviewPropsEntry = Schema.Struct({
  exportName: TrimmedNonEmptyString,
  props: Schema.Array(ComponentPreviewPropSpec),
});
export type ComponentPreviewPropsEntry = typeof ComponentPreviewPropsEntry.Type;

export const ComponentPreviewManifest = Schema.Struct({
  relativePath: TrimmedNonEmptyString,
  exports: Schema.Array(ComponentPreviewExportSpec),
  /** Props keyed by export name (including `default`). */
  propsByExport: Schema.Array(ComponentPreviewPropsEntry),
  diagnostics: Schema.Array(TrimmedString),
});
export type ComponentPreviewManifest = typeof ComponentPreviewManifest.Type;

export const ProjectAnalyzeReactComponentInput = Schema.Struct({
  cwd: TrimmedNonEmptyString,
  relativePath: TrimmedNonEmptyString.check(Schema.isMaxLength(PROJECT_WRITE_FILE_PATH_MAX_LENGTH)),
  /** When set, prioritize props for this export (`default` for default export). */
  exportName: Schema.optional(TrimmedNonEmptyString),
});
export type ProjectAnalyzeReactComponentInput = typeof ProjectAnalyzeReactComponentInput.Type;

export const ProjectAnalyzeReactComponentResult = Schema.Struct({
  manifest: ComponentPreviewManifest,
});
export type ProjectAnalyzeReactComponentResult = typeof ProjectAnalyzeReactComponentResult.Type;

export class ProjectAnalyzeReactComponentError extends Schema.TaggedErrorClass<ProjectAnalyzeReactComponentError>()(
  "ProjectAnalyzeReactComponentError",
  {
    message: TrimmedNonEmptyString,
    cause: Schema.optional(Schema.Defect),
  },
) {}

export const ProjectBuildComponentPreviewInput = Schema.Struct({
  cwd: TrimmedNonEmptyString,
  relativePath: TrimmedNonEmptyString.check(Schema.isMaxLength(PROJECT_WRITE_FILE_PATH_MAX_LENGTH)),
  /** Named export or `default`. */
  exportName: TrimmedNonEmptyString,
});
export type ProjectBuildComponentPreviewInput = typeof ProjectBuildComponentPreviewInput.Type;

export const ProjectBuildComponentPreviewResult = Schema.Struct({
  ok: Schema.Boolean,
  javascript: Schema.optional(Schema.String),
  warnings: Schema.Array(TrimmedString),
  errors: Schema.Array(TrimmedString),
});
export type ProjectBuildComponentPreviewResult = typeof ProjectBuildComponentPreviewResult.Type;

export class ProjectBuildComponentPreviewError extends Schema.TaggedErrorClass<ProjectBuildComponentPreviewError>()(
  "ProjectBuildComponentPreviewError",
  {
    message: TrimmedNonEmptyString,
    cause: Schema.optional(Schema.Defect),
  },
) {}

export const ProjectVariantShowcaseExport = Schema.Struct({
  exportName: TrimmedNonEmptyString,
  label: TrimmedNonEmptyString,
});
export type ProjectVariantShowcaseExport = typeof ProjectVariantShowcaseExport.Type;

export const ProjectBuildComponentVariantShowcaseInput = Schema.Struct({
  cwd: TrimmedNonEmptyString,
  relativePath: TrimmedNonEmptyString.check(Schema.isMaxLength(PROJECT_WRITE_FILE_PATH_MAX_LENGTH)),
  exports: Schema.Array(ProjectVariantShowcaseExport).check(Schema.isMinLength(1)),
});
export type ProjectBuildComponentVariantShowcaseInput =
  typeof ProjectBuildComponentVariantShowcaseInput.Type;

export const ProjectBuildComponentVariantShowcaseResult = Schema.Struct({
  ok: Schema.Boolean,
  javascript: Schema.optional(Schema.String),
  warnings: Schema.Array(TrimmedString),
  errors: Schema.Array(TrimmedString),
});
export type ProjectBuildComponentVariantShowcaseResult =
  typeof ProjectBuildComponentVariantShowcaseResult.Type;

export class ProjectBuildComponentVariantShowcaseError extends Schema.TaggedErrorClass<ProjectBuildComponentVariantShowcaseError>()(
  "ProjectBuildComponentVariantShowcaseError",
  {
    message: TrimmedNonEmptyString,
    cause: Schema.optional(Schema.Defect),
  },
) {}

/** A single cell of the prop-based variant grid: the primary export rendered with `propsJson`. */
export const ProjectPropVariantCell = Schema.Struct({
  /** Grouping heading (the prop name being varied, e.g. "variant"). */
  section: TrimmedNonEmptyString,
  /** Cell label (the prop value, e.g. "outline"). */
  label: TrimmedNonEmptyString,
  /** JSON-encoded props object passed to the component for this cell. */
  propsJson: Schema.String,
});
export type ProjectPropVariantCell = typeof ProjectPropVariantCell.Type;

export const ProjectBuildComponentPropVariantShowcaseInput = Schema.Struct({
  cwd: TrimmedNonEmptyString,
  relativePath: TrimmedNonEmptyString.check(Schema.isMaxLength(PROJECT_WRITE_FILE_PATH_MAX_LENGTH)),
  /** The export to render in every cell (named export or `default`). */
  exportName: TrimmedNonEmptyString,
  cells: Schema.Array(ProjectPropVariantCell).check(Schema.isMinLength(1)),
});
export type ProjectBuildComponentPropVariantShowcaseInput =
  typeof ProjectBuildComponentPropVariantShowcaseInput.Type;

export const ProjectBuildComponentPropVariantShowcaseResult = Schema.Struct({
  ok: Schema.Boolean,
  javascript: Schema.optional(Schema.String),
  warnings: Schema.Array(TrimmedString),
  errors: Schema.Array(TrimmedString),
});
export type ProjectBuildComponentPropVariantShowcaseResult =
  typeof ProjectBuildComponentPropVariantShowcaseResult.Type;

export class ProjectBuildComponentPropVariantShowcaseError extends Schema.TaggedErrorClass<ProjectBuildComponentPropVariantShowcaseError>()(
  "ProjectBuildComponentPropVariantShowcaseError",
  {
    message: TrimmedNonEmptyString,
    cause: Schema.optional(Schema.Defect),
  },
) {}
