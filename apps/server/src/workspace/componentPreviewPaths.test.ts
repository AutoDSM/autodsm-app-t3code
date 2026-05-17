import { describe, expect, it } from "vitest";

import {
  isWorkspaceSrcComponentsUiRelativePath,
  normalizeWorkspaceRelativePathPosix,
} from "./componentPreviewPaths.ts";

describe("componentPreviewPaths", () => {
  it("normalizes backslashes to posix separators", () => {
    expect(normalizeWorkspaceRelativePathPosix("src\\components\\A.tsx")).toBe(
      "src/components/A.tsx",
    );
  });

  it("accepts src/components/*.tsx", () => {
    expect(isWorkspaceSrcComponentsUiRelativePath("src/components/Button.tsx")).toBe(true);
  });

  it("accepts nested paths under src/components", () => {
    expect(isWorkspaceSrcComponentsUiRelativePath("src/components/foo/Card.tsx")).toBe(true);
  });

  it("accepts packages/*/src/components paths", () => {
    expect(isWorkspaceSrcComponentsUiRelativePath("packages/ui/src/components/Badge.tsx")).toBe(
      true,
    );
  });

  it("rejects paths outside src/components UI subtree", () => {
    expect(isWorkspaceSrcComponentsUiRelativePath("src/lib/Button.tsx")).toBe(false);
    expect(isWorkspaceSrcComponentsUiRelativePath("README.md")).toBe(false);
  });

  it("rejects non tsx/jsx extensions", () => {
    expect(isWorkspaceSrcComponentsUiRelativePath("src/components/readme.ts")).toBe(false);
  });

  it("rejects traversal segments", () => {
    expect(isWorkspaceSrcComponentsUiRelativePath("src/components/../secret.tsx")).toBe(false);
  });
});
