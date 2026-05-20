import { describe, expect, it } from "vitest";

import { formatUnknownErrorMessage } from "./formatUnknownErrorMessage";

describe("formatUnknownErrorMessage", () => {
  it("reads message fields from tagged rpc errors", () => {
    expect(
      formatUnknownErrorMessage({
        _tag: "RpcClientError",
        message: "Method not found: autodsm.removeComponentAgent",
      }),
    ).toBe("Method not found: autodsm.removeComponentAgent");
  });

  it("uses a caller-provided fallback for opaque objects", () => {
    expect(formatUnknownErrorMessage({}, "Delete failed.")).toBe("Delete failed.");
  });
});
