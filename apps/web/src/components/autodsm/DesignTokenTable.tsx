"use client";

import type {
  AutoDsmBrandToken,
  AutoDsmBrandTokenCategory,
  AutoDsmBrandTokenDraft,
  AutoDsmBrandTokenPatch,
} from "@t3tools/contracts";
import { CheckIcon, PencilIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react";
import { useMemo, useState, type JSX } from "react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { formatOklchValueAsRgb } from "~/lib/colorFormat";
import {
  buildColorTokenScope,
  resolveColorTokenValue,
  type ResolvedColorValue,
} from "~/lib/colorTokenTiers";
import {
  buildTokenDraft,
  EMPTY_TOKEN_DRAFT_FIELDS,
  tokenDisplayName,
  tokenFieldsFromToken,
  tokenMentionHandle,
  type TokenDraftFields,
} from "~/lib/designTokenGroups";

interface DesignTokenTableProps {
  readonly category: AutoDsmBrandTokenCategory;
  readonly tokens: readonly AutoDsmBrandToken[];
  /**
   * Full color-token list used to resolve `var(--…)` references when rendering
   * semantic color rows. Only consulted for the color category.
   */
  readonly colorResolutionScope?: readonly AutoDsmBrandToken[];
  readonly emptyMessage?: string;
  readonly onAdd: (draft: AutoDsmBrandTokenDraft) => Promise<void>;
  readonly onUpdate: (tokenId: string, patch: AutoDsmBrandTokenPatch) => Promise<void>;
  readonly onRemove: (tokenId: string) => void;
  readonly addPending: boolean;
  readonly updatePending: boolean;
  readonly removingId: string | null;
  readonly editingId: string | null;
  readonly onEditingIdChange: (tokenId: string | null) => void;
}

const VALUE_COLUMNS: Record<AutoDsmBrandTokenCategory, readonly string[]> = {
  color: ["Light", "Dark"],
  typography: ["Font", "Size", "Spacing"],
  spacing: ["Value"],
  motion: ["Value"],
};

function ColorSwatch({ value }: { readonly value: string | undefined }): JSX.Element {
  return (
    <span
      aria-hidden
      className="inline-block size-4 shrink-0 rounded-full border border-border/80"
      style={value ? { backgroundColor: value } : undefined}
    />
  );
}

interface ColorCellProps {
  readonly value: string | undefined;
  readonly resolution?: ResolvedColorValue;
}

function ColorCell({ value, resolution }: ColorCellProps): JSX.Element {
  if (!value && !resolution?.referenceName) {
    return <span className="text-muted-foreground">—</span>;
  }
  const resolvedColor = resolution?.value ?? null;
  const referenceName = resolution?.referenceName ?? null;
  const swatchValue = resolvedColor ?? (value && !referenceName ? value : undefined);
  const displayText = resolvedColor
    ? formatOklchValueAsRgb(resolvedColor)
    : referenceName
      ? "Unresolved"
      : value
        ? formatOklchValueAsRgb(value)
        : "—";

  return (
    <span className="flex flex-col gap-0.5">
      <span className="flex items-center gap-2">
        <ColorSwatch value={swatchValue} />
        <span className="font-mono text-muted-foreground">{displayText}</span>
      </span>
      {referenceName ? (
        <span className="ml-6 font-mono text-xs text-muted-foreground">→ @{referenceName}</span>
      ) : null}
    </span>
  );
}

function colorResolutionFor(
  token: AutoDsmBrandToken,
  channel: "light" | "dark",
  scope: ReadonlyMap<string, AutoDsmBrandToken> | null,
): ResolvedColorValue | undefined {
  if (scope === null) return undefined;
  return resolveColorTokenValue(token, scope, channel);
}

function valueCells(
  category: AutoDsmBrandTokenCategory,
  token: AutoDsmBrandToken,
  colorScope: ReadonlyMap<string, AutoDsmBrandToken> | null,
): JSX.Element[] {
  if (category === "color") {
    const lightResolution = colorResolutionFor(token, "light", colorScope);
    const darkResolution = colorResolutionFor(token, "dark", colorScope);
    return [
      <TableCell key="light">
        <ColorCell
          value={token.color?.light ?? token.value}
          {...(lightResolution !== undefined ? { resolution: lightResolution } : {})}
        />
      </TableCell>,
      <TableCell key="dark">
        <ColorCell
          value={token.color?.dark}
          {...(darkResolution !== undefined ? { resolution: darkResolution } : {})}
        />
      </TableCell>,
    ];
  }
  if (category === "typography") {
    return [
      <TableCell key="font" className="text-muted-foreground">
        {token.typography?.fontFamily ?? "—"}
      </TableCell>,
      <TableCell key="size" className="font-mono text-muted-foreground">
        {token.typography?.fontSize ?? token.value}
      </TableCell>,
      <TableCell key="spacing" className="font-mono text-muted-foreground">
        {token.typography?.letterSpacing ?? "—"}
      </TableCell>,
    ];
  }
  return [
    <TableCell key="value" className="font-mono text-muted-foreground">
      {token.value}
    </TableCell>,
  ];
}

function draftToPatch(
  category: AutoDsmBrandTokenCategory,
  draft: AutoDsmBrandTokenDraft,
): AutoDsmBrandTokenPatch {
  return {
    name: draft.name,
    value: draft.value,
    ...(draft.color !== undefined ? { color: draft.color } : {}),
    ...(draft.typography !== undefined ? { typography: draft.typography } : {}),
  };
}

/** Per-category token table with inline add/edit rows and per-row removal. */
export function DesignTokenTable({
  category,
  tokens,
  colorResolutionScope,
  emptyMessage,
  onAdd,
  onUpdate,
  onRemove,
  addPending,
  updatePending,
  removingId,
  editingId,
  onEditingIdChange,
}: DesignTokenTableProps): JSX.Element {
  const [adding, setAdding] = useState(false);
  const [fields, setFields] = useState<TokenDraftFields>(EMPTY_TOKEN_DRAFT_FIELDS);
  const [error, setError] = useState<string | null>(null);

  const valueColumns = VALUE_COLUMNS[category];
  const columnCount = 1 + valueColumns.length + 1;

  const colorScope = useMemo<ReadonlyMap<string, AutoDsmBrandToken> | null>(() => {
    if (category !== "color" || !colorResolutionScope) return null;
    return buildColorTokenScope(colorResolutionScope);
  }, [category, colorResolutionScope]);

  const setField = (key: keyof TokenDraftFields, value: string): void => {
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  const closeAddRow = (): void => {
    setAdding(false);
    setFields(EMPTY_TOKEN_DRAFT_FIELDS);
    setError(null);
  };

  const closeEditRow = (): void => {
    onEditingIdChange(null);
    setFields(EMPTY_TOKEN_DRAFT_FIELDS);
    setError(null);
  };

  const submitAddRow = async (): Promise<void> => {
    const result = buildTokenDraft(category, fields);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    try {
      await onAdd(result.draft);
      closeAddRow();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to add token.");
    }
  };

  const submitEditRow = async (tokenId: string): Promise<void> => {
    const result = buildTokenDraft(category, fields);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    try {
      await onUpdate(tokenId, draftToPatch(category, result.draft));
      closeEditRow();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to update token.");
    }
  };

  const startEdit = (token: AutoDsmBrandToken): void => {
    setAdding(false);
    onEditingIdChange(token.id);
    setFields(tokenFieldsFromToken(token));
    setError(null);
  };

  const draftInput = (key: keyof TokenDraftFields, placeholder: string): JSX.Element => (
    <Input
      size="sm"
      value={fields[key]}
      placeholder={placeholder}
      disabled={addPending || updatePending}
      onChange={(event) => {
        setField(key, event.target.value);
      }}
    />
  );

  const draftValueCells = (): JSX.Element[] => {
    if (category === "color") {
      return [
        <TableCell key="light">{draftInput("light", "#000000 / oklch(…)")}</TableCell>,
        <TableCell key="dark">{draftInput("dark", "optional dark value")}</TableCell>,
      ];
    }
    if (category === "typography") {
      return [
        <TableCell key="font">{draftInput("fontFamily", "Manrope")}</TableCell>,
        <TableCell key="size">{draftInput("fontSize", "16px")}</TableCell>,
        <TableCell key="spacing">{draftInput("letterSpacing", "0")}</TableCell>,
      ];
    }
    return [<TableCell key="value">{draftInput("value", "value")}</TableCell>];
  };

  const draftActionCells = (onSave: () => void, onCancel: () => void): JSX.Element => (
    <TableCell>
      <div className="flex justify-end gap-1">
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Save token"
          disabled={addPending || updatePending}
          onClick={onSave}
        >
          <CheckIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Cancel"
          disabled={addPending || updatePending}
          onClick={onCancel}
        >
          <XIcon />
        </Button>
      </div>
    </TableCell>
  );

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-lg border border-border/60">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>Name</TableHead>
              {valueColumns.map((label) => (
                <TableHead key={label}>{label}</TableHead>
              ))}
              <TableHead className="w-24 text-right" aria-label="Actions" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {tokens.length === 0 && !adding ? (
              <TableRow>
                <TableCell colSpan={columnCount} className="text-muted-foreground">
                  {emptyMessage ??
                    `No ${category} tokens yet — resync from your design system or add one below.`}
                </TableCell>
              </TableRow>
            ) : null}

            {tokens.map((token) =>
              editingId === token.id ? (
                <TableRow key={token.id} className="bg-muted/20">
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {draftInput("name", "token name")}
                      <span className="font-mono text-xs text-muted-foreground">
                        {tokenMentionHandle({ ...token, name: fields.name || token.name })}
                      </span>
                    </div>
                  </TableCell>
                  {draftValueCells()}
                  {draftActionCells(() => {
                    void submitEditRow(token.id);
                  }, closeEditRow)}
                </TableRow>
              ) : (
                <TableRow key={token.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">{tokenDisplayName(token)}</span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {tokenMentionHandle(token)}
                      </span>
                    </div>
                  </TableCell>
                  {valueCells(category, token, colorScope)}
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label={`Edit ${tokenDisplayName(token)}`}
                        disabled={editingId !== null || removingId === token.id}
                        onClick={() => {
                          startEdit(token);
                        }}
                      >
                        <PencilIcon />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label={`Remove ${tokenDisplayName(token)}`}
                        disabled={removingId === token.id}
                        onClick={() => {
                          onRemove(token.id);
                        }}
                      >
                        <Trash2Icon />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ),
            )}

            {adding ? (
              <TableRow className="bg-muted/20">
                <TableCell>
                  <div className="flex flex-col gap-1">
                    {draftInput("name", "token name")}
                    <span className="font-mono text-xs text-muted-foreground">
                      {fields.name.trim().length > 0 ? `@${fields.name.trim()}` : "—"}
                    </span>
                  </div>
                </TableCell>
                {draftValueCells()}
                {draftActionCells(() => {
                  void submitAddRow();
                }, closeAddRow)}
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      {!adding && editingId === null ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setAdding(true);
            setError(null);
          }}
        >
          <PlusIcon />
          Add token
        </Button>
      ) : null}
    </div>
  );
}
