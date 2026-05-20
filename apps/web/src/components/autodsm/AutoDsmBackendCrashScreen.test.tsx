import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AutoDsmBackendCrashScreen } from "./AutoDsmBackendCrashScreen";

describe("AutoDsmBackendCrashScreen", () => {
  it("renders the fatal backend message with attempt count and reason", () => {
    const html = renderToStaticMarkup(
      <AutoDsmBackendCrashScreen reason="code=1" attempts={3} logDir="/tmp/t3/dev/logs" />,
    );

    expect(html).toContain("Backend crashed and could not recover");
    expect(html).toContain("3 restart attempts");
    expect(html).toContain("code=1");
    expect(html).toContain("Restart app");
    expect(html).toContain("Open logs folder");
  });
});
