// @effect-diagnostics nodeBuiltinImport:off
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { detectCssPreviewEntryCandidates } from "./autoDsmHelpers.ts";

describe("detectCssPreviewEntryCandidates", () => {
  let dir: string | undefined;

  afterEach(() => {
    if (dir !== undefined) {
      fs.rmSync(dir, { recursive: true, force: true });
      dir = undefined;
    }
  });

  it("returns posix paths for files that exist", () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "t3-autodsm-css-"));
    fs.mkdirSync(path.join(dir, "src"), { recursive: true });
    fs.writeFileSync(path.join(dir, "src/index.css"), "body{}", "utf8");

    const hits = detectCssPreviewEntryCandidates(dir);
    expect(hits).toContain("/src/index.css");
  });

  it("returns empty list when no candidate css exists", () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "t3-autodsm-css-empty-"));

    expect(detectCssPreviewEntryCandidates(dir)).toEqual([]);
  });
});
