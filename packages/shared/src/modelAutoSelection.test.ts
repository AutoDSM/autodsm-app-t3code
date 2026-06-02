import {
  type ModelCapabilities,
  ProviderDriverKind,
  ProviderInstanceId,
} from "@t3tools/contracts";
import { describe, expect, it } from "vitest";

import {
  type AutoModelCandidate,
  type AutoSelectionSignals,
  isAutoModelSelection,
  rankForModelSlug,
  resolveAutoModelSelection,
} from "./model.ts";

const claude = ProviderDriverKind.make("claudeAgent");
const codex = ProviderDriverKind.make("codex");

function candidate(
  instanceId: string,
  driverKind: ProviderDriverKind,
  model: string,
  capabilities?: ModelCapabilities,
): AutoModelCandidate {
  return {
    instanceId: ProviderInstanceId.make(instanceId),
    driverKind,
    model,
    capabilities: capabilities ?? null,
  };
}

const HAIKU = candidate("claudeAgent", claude, "claude-haiku-4-5");
const SONNET = candidate("claudeAgent", claude, "claude-sonnet-4-6");
const OPUS = candidate("claudeAgent", claude, "claude-opus-4-7");
const GPT54 = candidate("codex", codex, "gpt-5.4");

function signals(overrides: Partial<AutoSelectionSignals> = {}): AutoSelectionSignals {
  return { purpose: "turn", promptLength: 400, ...overrides };
}

describe("rankForModelSlug", () => {
  it("ranks known slugs from the curated table", () => {
    expect(rankForModelSlug("claude-opus-4-7").tier).toBe("frontier");
    expect(rankForModelSlug("claude-sonnet-4-6").tier).toBe("balanced");
    expect(rankForModelSlug("claude-haiku-4-5").tier).toBe("fast");
  });

  it("falls back to slug heuristics for unknown models", () => {
    expect(rankForModelSlug("myorg/some-opus-variant").tier).toBe("frontier");
    expect(rankForModelSlug("vendor-flash-mini").tier).toBe("fast");
    expect(rankForModelSlug("vendor-sonnet-clone").tier).toBe("balanced");
  });
});

describe("resolveAutoModelSelection", () => {
  it("routes plan-mode turns to the strongest available model", () => {
    const result = resolveAutoModelSelection({
      candidates: [HAIKU, SONNET, OPUS],
      signals: signals({ interactionMode: "plan", promptLength: 50 }),
    });
    expect(result?.model).toBe("claude-opus-4-7");
  });

  it("routes long prompts to a frontier model", () => {
    const result = resolveAutoModelSelection({
      candidates: [HAIKU, SONNET, OPUS],
      signals: signals({ promptLength: 2000 }),
    });
    expect(result?.model).toBe("claude-opus-4-7");
  });

  it("routes image prompts to a frontier model", () => {
    const result = resolveAutoModelSelection({
      candidates: [HAIKU, SONNET, OPUS],
      signals: signals({ promptLength: 30, hasImageAttachments: true }),
    });
    expect(result?.model).toBe("claude-opus-4-7");
  });

  it("routes short trivial prompts to a fast model", () => {
    const result = resolveAutoModelSelection({
      candidates: [HAIKU, SONNET, OPUS],
      signals: signals({ promptLength: 12 }),
    });
    expect(result?.model).toBe("claude-haiku-4-5");
  });

  it("routes everyday prompts to a balanced model", () => {
    const result = resolveAutoModelSelection({
      candidates: [HAIKU, SONNET, OPUS],
      signals: signals({ promptLength: 500 }),
    });
    expect(result?.model).toBe("claude-sonnet-4-6");
  });

  it("always uses a fast model for text generation", () => {
    const result = resolveAutoModelSelection({
      candidates: [HAIKU, SONNET, OPUS],
      signals: signals({ purpose: "textgen", promptLength: 5000 }),
    });
    expect(result?.model).toBe("claude-haiku-4-5");
  });

  it("picks the cheapest available when every candidate exceeds the target", () => {
    // Target is fast (short prompt) but only balanced + frontier are available.
    const result = resolveAutoModelSelection({
      candidates: [SONNET, OPUS],
      signals: signals({ promptLength: 10 }),
    });
    expect(result?.model).toBe("claude-sonnet-4-6");
  });

  it("breaks score ties using provider priority (Claude before Codex)", () => {
    const claudeCustom = candidate("claudeAgent", claude, "acme/opus-next");
    const codexCustom = candidate("codex", codex, "acme/gpt-5-next");
    const result = resolveAutoModelSelection({
      candidates: [codexCustom, claudeCustom],
      signals: signals({ promptLength: 2000 }),
    });
    expect(result?.instanceId).toBe(ProviderInstanceId.make("claudeAgent"));
  });

  it("stays within the locked instance when cross-provider switching is unavailable", () => {
    const result = resolveAutoModelSelection({
      candidates: [OPUS, GPT54],
      signals: signals({ promptLength: 2000 }),
      lockedInstanceId: ProviderInstanceId.make("codex"),
    });
    expect(result?.instanceId).toBe(ProviderInstanceId.make("codex"));
    expect(result?.model).toBe("gpt-5.4");
  });

  it("returns null when there are no candidates", () => {
    expect(resolveAutoModelSelection({ candidates: [], signals: signals() })).toBeNull();
    expect(
      resolveAutoModelSelection({
        candidates: [OPUS],
        signals: signals(),
        lockedInstanceId: ProviderInstanceId.make("codex"),
      }),
    ).toBeNull();
  });

  it("nudges effort to the strongest option for frontier turns", () => {
    const caps: ModelCapabilities = {
      optionDescriptors: [
        {
          id: "effort",
          label: "Reasoning",
          type: "select",
          options: [
            { id: "low", label: "Low" },
            { id: "high", label: "High" },
            { id: "xhigh", label: "Extra High", isDefault: true },
            { id: "max", label: "Max" },
          ],
        },
      ],
    };
    const result = resolveAutoModelSelection({
      candidates: [candidate("claudeAgent", claude, "claude-opus-4-7", caps)],
      signals: signals({ promptLength: 2000 }),
    });
    expect(result?.options?.find((option) => option.id === "effort")?.value).toBe("max");
  });

  it("nudges effort to a low option for fast turns", () => {
    const caps: ModelCapabilities = {
      optionDescriptors: [
        {
          id: "effort",
          label: "Reasoning",
          type: "select",
          options: [
            { id: "low", label: "Low" },
            { id: "medium", label: "Medium", isDefault: true },
            { id: "high", label: "High" },
          ],
        },
      ],
    };
    const result = resolveAutoModelSelection({
      candidates: [candidate("claudeAgent", claude, "claude-haiku-4-5", caps)],
      signals: signals({ promptLength: 8 }),
    });
    expect(result?.options?.find((option) => option.id === "effort")?.value).toBe("low");
  });

  it("produces a selection recognized as Auto-free (concrete instance)", () => {
    const result = resolveAutoModelSelection({
      candidates: [OPUS],
      signals: signals({ promptLength: 2000 }),
    });
    expect(result).not.toBeNull();
    expect(isAutoModelSelection(result)).toBe(false);
  });
});
