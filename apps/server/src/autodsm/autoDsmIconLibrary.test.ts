// @effect-diagnostics nodeBuiltinImport:off
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("node:child_process", () => ({
  spawnSync: vi.fn(() => ({
    status: 0,
    stdout: "",
    stderr: "",
  })),
}));

import { installIconLibrary } from "./autoDsmIconLibrary.ts";

const createdDirs: string[] = [];

afterEach(() => {
  for (const dir of createdDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("installIconLibrary", () => {
  it("updates components.json iconLibrary and returns resynced profile", () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "autodsm-icon-lib-"));
    createdDirs.push(cwd);
    fs.mkdirSync(path.join(cwd, "src"), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, "components.json"),
      `${JSON.stringify({ iconLibrary: "lucide" }, null, 2)}\n`,
      "utf8",
    );
    fs.writeFileSync(path.join(cwd, "package.json"), `{"name":"ws-test"}\n`, "utf8");
    fs.writeFileSync(
      path.join(cwd, "src/index.css"),
      `:root { --background: #fff; --foreground: #000; --primary: #111; }\n`,
      "utf8",
    );

    const profile = installIconLibrary(cwd, "heroicons");
    const parsed = JSON.parse(fs.readFileSync(path.join(cwd, "components.json"), "utf8")) as {
      iconLibrary?: string;
    };
    expect(parsed.iconLibrary).toBe("heroicons");
    const iconToken = profile.tokens.find((token) => token.name === "icon-library");
    expect(iconToken?.value).toBe("heroicons");
  });
});
