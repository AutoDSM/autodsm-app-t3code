import type { ComponentPreviewManifest } from "@t3tools/contracts";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi, beforeEach } from "vitest";

const manifest: ComponentPreviewManifest = {
  relativePath: "src/components/Button.tsx",
  exports: [{ name: "Button", kind: "function", isDefault: true }],
  propsByExport: [
    {
      exportName: "Button",
      props: [{ name: "label", kind: "string", optional: false }],
    },
  ],
  diagnostics: [],
};

let manifestQueryState = {
  isPending: false,
  isFetching: false,
  isError: false,
  data: { manifest } as { manifest: ComponentPreviewManifest },
};

let bundleQueryState = {
  isPending: false,
  isFetching: false,
  isError: false,
  data: { ok: true, bundledJavascript: "export default function Button(){return null}" } as {
    ok: boolean;
    bundledJavascript?: string;
  },
};

vi.mock("@tanstack/react-query", () => ({
  useQuery: ({ queryKey }: { queryKey: readonly unknown[] }) => {
    const key = String(queryKey[0]);
    if (key === "component-preview-manifest") {
      return manifestQueryState;
    }
    if (key.startsWith("component-preview-bundle") || key.includes("executeRenderPlan")) {
      return bundleQueryState;
    }
    return { isPending: false, isFetching: false, isError: false, data: { entries: [] } };
  },
}));

vi.mock("~/environmentApi", () => ({
  ensureEnvironmentApi: () => ({
    projects: {
      analyzeReactComponent: vi.fn(),
      buildComponentPreview: vi.fn(),
    },
    autodsm: {
      getComponentRegistry: vi.fn(),
      executeRenderPlan: vi.fn(),
    },
  }),
}));

import { WebContentsView } from "./WebContentsView";

describe("WebContentsView product variant", () => {
  beforeEach(() => {
    manifestQueryState = {
      isPending: false,
      isFetching: false,
      isError: false,
      data: { manifest },
    };
    bundleQueryState = {
      isPending: false,
      isFetching: false,
      isError: false,
      data: { ok: true, bundledJavascript: "export default function Button(){return null}" },
    };
    vi.stubGlobal("window", {
      location: { origin: "http://localhost:5733" },
      desktopBridge: undefined,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });

  it("hides dev chrome in product mode", () => {
    const html = renderToStaticMarkup(
      <WebContentsView
        relativePath="src/components/Button.tsx"
        environmentId={"env-1" as never}
        workspaceCwd="/tmp/workspace"
        variant="product"
      />,
    );

    expect(html).toContain('data-preview-variant="product"');
    expect(html).not.toContain("Prompt: fix preview");
    expect(html).not.toContain("Export");
    expect(html).not.toContain("Screenshot");
  });

  it("shows skeleton instead of analyzing copy while manifest is pending in product mode", () => {
    manifestQueryState = {
      isPending: true,
      isFetching: true,
      isError: false,
      data: undefined as unknown as { manifest: ComponentPreviewManifest },
    };

    const html = renderToStaticMarkup(
      <WebContentsView
        relativePath="src/components/Button.tsx"
        environmentId={"env-1" as never}
        workspaceCwd="/tmp/workspace"
        variant="product"
      />,
    );

    expect(html).toContain('data-testid="component-preview-loading-skeleton"');
    expect(html).not.toContain("Analyzing component…");
  });

  it("hides native placeholder copy in product mode when desktop bridge is available", () => {
    vi.stubGlobal("window", {
      location: { origin: "http://localhost:5733" },
      desktopBridge: {
        attachComponentPreview: vi.fn(async () => true),
        setComponentPreviewBounds: vi.fn(),
        primeComponentPreview: vi.fn(async () => true),
        detachComponentPreview: vi.fn(),
      },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });

    const html = renderToStaticMarkup(
      <WebContentsView
        relativePath="src/components/Button.tsx"
        environmentId={"env-1" as never}
        workspaceCwd="/tmp/workspace"
        variant="product"
      />,
    );

    expect(html).toContain('data-testid="component-preview-native-host"');
    expect(html).not.toContain("Native preview host active");
  });

  it("shows dev chrome in dev mode", () => {
    const html = renderToStaticMarkup(
      <WebContentsView
        relativePath="src/components/Button.tsx"
        environmentId={"env-1" as never}
        workspaceCwd="/tmp/workspace"
        variant="dev"
      />,
    );

    expect(html).toContain('data-preview-variant="dev"');
    expect(html).toContain("Prompt: fix preview");
    expect(html).toContain("Export");
  });

  it("shows loading skeleton while refetching when cached manifest path does not match", () => {
    manifestQueryState = {
      isPending: false,
      isFetching: true,
      isError: false,
      data: {
        manifest: {
          ...manifest,
          relativePath: "src/components/Badge.tsx",
        },
      },
    };
    bundleQueryState = {
      isPending: false,
      isFetching: false,
      isError: false,
      data: { ok: true, bundledJavascript: "export default function Badge(){return null}" },
    };

    const html = renderToStaticMarkup(
      <WebContentsView
        relativePath="src/components/Button.tsx"
        environmentId={"env-1" as never}
        workspaceCwd="/tmp/workspace"
        variant="product"
      />,
    );

    expect(html).toContain('data-testid="component-preview-loading-skeleton"');
  });

  it("keeps analyzing copy in dev mode while manifest is pending", () => {
    manifestQueryState = {
      isPending: true,
      isFetching: true,
      isError: false,
      data: undefined as unknown as { manifest: ComponentPreviewManifest },
    };

    const html = renderToStaticMarkup(
      <WebContentsView
        relativePath="src/components/Button.tsx"
        environmentId={"env-1" as never}
        workspaceCwd="/tmp/workspace"
        variant="dev"
      />,
    );

    expect(html).toContain("Analyzing component…");
    expect(html).not.toContain('data-testid="component-preview-loading-skeleton"');
  });
});
