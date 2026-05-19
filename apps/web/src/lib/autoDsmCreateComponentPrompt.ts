import { applyClaudePromptEffortPrefix, resolvePromptInjectedEffort } from "@t3tools/shared/model";
import type { ProviderDriverKind, ServerProvider } from "@t3tools/contracts";

import { getProviderModelCapabilities } from "~/providerModels";

export function buildAutoDsmCreateComponentPrompt(input: {
  readonly userPrompt: string;
  readonly componentPath: string;
  readonly starterId?: string | null;
}): string {
  const lines = [
    input.userPrompt.trim(),
    "",
    "## AutoDSM — Create component",
    "",
    `Create a focused React component and write it only to \`${input.componentPath}\`.`,
    "- Follow the active workspace starter/library conventions.",
    "- Use active design tokens and keep the component composable (atomic-design scope).",
    "- Add or update a Storybook story under `storybook/stories/` when the workspace template supports it.",
    "- Do not modify unrelated files unless required for preview or render.",
  ];

  if (input.starterId?.trim()) {
    lines.push(`- Active starter/library: ${input.starterId.trim()}.`);
  }

  return lines.join("\n");
}

export function formatCreateComponentOutgoingPrompt(params: {
  readonly provider: ProviderDriverKind;
  readonly model: string | null;
  readonly models: ReadonlyArray<ServerProvider["models"][number]>;
  readonly effort: string | null;
  readonly userPrompt: string;
  readonly componentPath: string;
  readonly starterId?: string | null;
}): string {
  const text = buildAutoDsmCreateComponentPrompt({
    userPrompt: params.userPrompt,
    componentPath: params.componentPath,
    ...(params.starterId !== undefined ? { starterId: params.starterId } : {}),
  });
  const caps = getProviderModelCapabilities(params.models, params.model, params.provider);
  const promptEffort = resolvePromptInjectedEffort(caps, params.effort);
  return applyClaudePromptEffortPrefix(text, promptEffort);
}
