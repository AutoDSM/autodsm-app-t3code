import { describe, expect, it } from "vitest";
import * as Schema from "effect/Schema";

import { AutoDsmBrandToken } from "./autodsmArtifacts.ts";

const BrandTokensFixtureSchema = Schema.Struct({
  schemaVersion: Schema.Literal(2),
  tokens: Schema.Array(AutoDsmBrandToken),
});

describe("autodsm persistence fixtures", () => {
  it("decodes canonical brand-tokens.json shape", () => {
    const decode = Schema.decodeUnknownSync(BrandTokensFixtureSchema);
    const fixture = decode({
      schemaVersion: 2,
      tokens: [
        {
          id: "css-var:primary",
          category: "color",
          name: "primary",
          value: "#8a38f5",
          origin: "scanned",
          sources: ["/src/index.css"],
          color: { light: "#8a38f5", dark: "#a366ff" },
        },
      ],
    });
    expect(fixture.tokens[0]?.name).toBe("primary");
  });

  it("decodes component-agents manifest envelope", () => {
    const decode = Schema.decodeUnknownSync(
      Schema.Struct({
        schemaVersion: Schema.Literal(1),
        workspaceId: Schema.String,
        agents: Schema.Array(
          Schema.Struct({ threadId: Schema.String, componentPath: Schema.String }),
        ),
      }),
    );
    const fixture = decode({
      schemaVersion: 1,
      workspaceId: "ws-1",
      agents: [{ threadId: "thread-1", componentPath: "/src/components/Button.tsx" }],
    });
    expect(fixture.agents).toHaveLength(1);
  });
});
