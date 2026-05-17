import { describe, expect, it } from "vitest";

import {
  dedupeStableSorted,
  isWorkspaceSrcComponentsUiRelativePath,
  normalizeWorkspaceRelativePathPosix,
} from "./srcComponentsWorkspacePaths";

describe("srcComponentsWorkspacePaths", () => {
  it("detects scoped UI component paths", () => {
    expect(isWorkspaceSrcComponentsUiRelativePath("src/components/Button.tsx")).toBe(true);
    expect(isWorkspaceSrcComponentsUiRelativePath("src/components/nested/card.jsx")).toBe(true);
    expect(isWorkspaceSrcComponentsUiRelativePath("packages/foo/src/components/x.tsx")).toBe(true);
    expect(isWorkspaceSrcComponentsUiRelativePath("src/components/Button.ts")).toBe(false);
    expect(isWorkspaceSrcComponentsUiRelativePath("src/components/Button.css")).toBe(false);
    expect(isWorkspaceSrcComponentsUiRelativePath("src/components/evil.tsx/../App.tsx")).toBe(
      false,
    );
  });

  it("normalizes backslashes before checks", () => {
    expect(
      isWorkspaceSrcComponentsUiRelativePath(
        normalizeWorkspaceRelativePathPosix("src\\components\\Box.tsx"),
      ),
    ).toBe(true);
  });

  it("sorts deterministically by basename then full path", () => {
    const next = dedupeStableSorted(["src/components/b/A.tsx", "src/components/Z.tsx"]);
    expect(next).toEqual(["src/components/b/A.tsx", "src/components/Z.tsx"]);
  });
});
