import { describe, expect, it } from "vitest";

import { sha256Hex } from "./hash";

describe("sha256Hex", () => {
  it("returns a stable hex digest", async () => {
    await expect(sha256Hex("workspace-123")).resolves.toMatch(/^[a-f0-9]{64}$/);
    await expect(sha256Hex("workspace-123")).resolves.toEqual(await sha256Hex("workspace-123"));
  });
});
