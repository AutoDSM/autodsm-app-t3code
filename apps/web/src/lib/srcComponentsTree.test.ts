import { describe, expect, it } from "vitest";

import { buildSrcComponentsTree } from "./srcComponentsTree";

describe("buildSrcComponentsTree", () => {
  it("groups multiple package roots and sorts by rootPath", () => {
    const roots = buildSrcComponentsTree([
      "packages/ui/src/components/B.tsx",
      "apps/web/src/components/A.tsx",
    ]);

    expect(roots.map((root) => root.rootPath)).toEqual([
      "apps/web/src/components",
      "packages/ui/src/components",
    ]);
    expect(roots[0]?.nodes[0]?.kind).toBe("file");
    expect(roots[0]?.nodes[0]?.kind === "file" && roots[0].nodes[0].name).toBe("A.tsx");
    expect(roots[1]?.nodes[0]?.kind === "file" && roots[1].nodes[0].name).toBe("B.tsx");
  });

  it("nests directories under each root with folders before files", () => {
    const roots = buildSrcComponentsTree([
      "apps/web/src/components/autodsm/A.tsx",
      "apps/web/src/components/autodsm/B.tsx",
      "apps/web/src/components/ChatView.tsx",
    ]);

    expect(roots).toHaveLength(1);
    const [root] = roots;
    expect(root?.rootPath).toBe("apps/web/src/components");
    expect(root?.nodes).toHaveLength(2);

    const dir = root?.nodes[0];
    expect(dir?.kind).toBe("directory");
    if (dir?.kind !== "directory") {
      return;
    }
    expect(dir.name).toBe("autodsm");
    expect(dir.path).toBe("apps/web/src/components/autodsm");
    expect(dir.children).toHaveLength(2);
    expect(dir.children[0]?.kind === "file" && dir.children[0].name).toBe("A.tsx");
    expect(dir.children[1]?.kind === "file" && dir.children[1].name).toBe("B.tsx");

    const file = root?.nodes[1];
    expect(file?.kind).toBe("file");
    if (file?.kind !== "file") {
      return;
    }
    expect(file.name).toBe("ChatView.tsx");
    expect(file.relativePath).toBe("apps/web/src/components/ChatView.tsx");
  });

  it("handles workspace-root src/components paths", () => {
    const roots = buildSrcComponentsTree(["src/components/X.tsx"]);
    expect(roots).toHaveLength(1);
    expect(roots[0]?.rootLabel).toBe("src/components");
    expect(roots[0]?.nodes[0]?.kind === "file" && roots[0].nodes[0].name).toBe("X.tsx");
  });

  it("sorts segments with numeric collation", () => {
    const roots = buildSrcComponentsTree([
      "apps/web/src/components/file10.tsx",
      "apps/web/src/components/file2.tsx",
    ]);
    expect(roots[0]?.nodes.map((n) => (n.kind === "file" ? n.name : ""))).toEqual([
      "file2.tsx",
      "file10.tsx",
    ]);
  });

  it("sorts directory and file names case-insensitively with numeric collation", () => {
    const roots = buildSrcComponentsTree([
      "apps/web/src/components/beta.tsx",
      "apps/web/src/components/Alpha.tsx",
    ]);
    expect(roots[0]?.nodes.map((n) => (n.kind === "file" ? n.name : ""))).toEqual([
      "Alpha.tsx",
      "beta.tsx",
    ]);
  });
});
