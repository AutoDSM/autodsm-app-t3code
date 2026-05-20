import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ComposerPromptEditorHandle } from "~/components/ComposerPromptEditor";

vi.mock("~/lib/autodsmWorkspaceReactQuery", () => ({
  autodsmBrandProfileQueryOptions: () => ({
    queryKey: ["autodsm", "brand-profile"],
    queryFn: async () => ({
      tokens: [
        {
          id: "color:primary",
          category: "color",
          name: "primary",
          value: "#8a38f5",
          origin: "scanned",
          sources: [],
          color: { light: "#8a38f5", dark: "#a366ff" },
        },
      ],
    }),
  }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({
    data: {
      tokens: [
        {
          id: "color:primary",
          category: "color",
          name: "primary",
          value: "#8a38f5",
          origin: "scanned",
          sources: [],
          color: { light: "#8a38f5", dark: "#a366ff" },
        },
      ],
    },
  }),
}));

vi.mock("~/hooks/useAutoDsmWorkspace", () => ({
  useAutoDsmWorkspace: () => ({
    cwd: "/tmp/system",
    environmentId: "env-1",
    projectId: "proj-1",
    projectName: "Demo System",
  }),
}));

vi.mock("~/hooks/useAutoDsmCreateComponent", () => ({
  useAutoDsmCreateComponent: () => ({
    isSubmitting: false,
    submitCreateComponent: vi.fn(),
  }),
}));

vi.mock("~/hooks/useSettings", () => ({
  useSettings: () => ({
    textGenerationModelSelection: {
      instanceId: "codex:default",
      model: "gpt-5",
      options: [],
    },
  }),
  useUpdateSettings: () => ({
    updateSettings: vi.fn(),
    resetSettings: vi.fn(),
  }),
}));

vi.mock("~/modelSelection", () => ({
  resolveAppModelSelectionState: () => ({
    instanceId: "codex:default",
    model: "gpt-5",
    options: [],
  }),
  getCustomModelOptionsByInstance: () => new Map(),
}));

vi.mock("~/components/ComposerPromptEditor", () => ({
  ComposerPromptEditor: (props: {
    brandTokens?: readonly unknown[];
    disableBrandTokenTypeahead?: boolean;
  }) => (
    <textarea
      data-testid="create-component-prompt"
      data-brand-token-count={props.brandTokens?.length ?? 0}
      data-disable-brand-token-typeahead={props.disableBrandTokenTypeahead ? "true" : "false"}
    />
  ),
}));

import {
  applyCreateComponentSuggestedPrompt,
  AutoDsmCreateComponentWorkspace,
} from "./AutoDsmCreateComponentWorkspace";

const SUGGESTED_PROMPT = "Create a primary button with hover and disabled states";

describe("AutoDsmCreateComponentWorkspace", () => {
  it("renders the heading, composer shell, and suggested prompts", () => {
    const html = renderToStaticMarkup(<AutoDsmCreateComponentWorkspace />);

    expect(html).toContain("Build a component for");
    expect(html).toContain("Demo System");
    expect(html).toContain("data-composer-prompt-footer");
    expect(html).not.toContain("Suggested prompts");
    expect(html).toContain(SUGGESTED_PROMPT);
    expect(html).toContain('aria-label="Create component"');
    expect(html).toContain('disabled=""');
    expect(html).toContain('data-brand-token-count="1"');
    expect(html).toContain('data-disable-brand-token-typeahead="true"');
  });
});

describe("applyCreateComponentSuggestedPrompt", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sets prompt and cursor before deferring focusAtEnd", () => {
    const setPrompt = vi.fn();
    const setCursor = vi.fn();
    const focusAtEnd = vi.fn();
    const editorRef = {
      current: {
        focus: vi.fn(),
        focusAt: vi.fn(),
        focusAtEnd,
        readSnapshot: () => ({
          value: "",
          cursor: 0,
          expandedCursor: 0,
          terminalContextIds: [],
        }),
      } satisfies ComposerPromptEditorHandle,
    };
    const callOrder: string[] = [];

    setPrompt.mockImplementation(() => {
      callOrder.push("setPrompt");
    });
    setCursor.mockImplementation(() => {
      callOrder.push("setCursor");
    });
    focusAtEnd.mockImplementation(() => {
      callOrder.push("focusAtEnd");
    });

    vi.stubGlobal("window", {
      requestAnimationFrame: (callback: FrameRequestCallback) => {
        callOrder.push("scheduleRaf");
        callback(0);
        return 1;
      },
    });

    applyCreateComponentSuggestedPrompt(SUGGESTED_PROMPT, editorRef, setPrompt, setCursor);

    expect(setPrompt).toHaveBeenCalledWith(SUGGESTED_PROMPT);
    expect(setCursor).toHaveBeenCalledWith(SUGGESTED_PROMPT.length);
    expect(focusAtEnd).toHaveBeenCalledTimes(1);
    expect(callOrder).toEqual(["setPrompt", "setCursor", "scheduleRaf", "focusAtEnd"]);
  });

  it("does not call focus synchronously with stale editor content", () => {
    const setPrompt = vi.fn();
    const setCursor = vi.fn();
    const focusAtEnd = vi.fn();
    const focus = vi.fn();
    const editorRef = {
      current: {
        focus,
        focusAt: vi.fn(),
        focusAtEnd,
        readSnapshot: () => ({
          value: "",
          cursor: 0,
          expandedCursor: 0,
          terminalContextIds: [],
        }),
      } satisfies ComposerPromptEditorHandle,
    };

    vi.stubGlobal("window", {
      requestAnimationFrame: (callback: FrameRequestCallback) => {
        callback(0);
        return 1;
      },
    });

    applyCreateComponentSuggestedPrompt(SUGGESTED_PROMPT, editorRef, setPrompt, setCursor);

    expect(focus).not.toHaveBeenCalled();
    expect(focusAtEnd).toHaveBeenCalledTimes(1);
  });
});
