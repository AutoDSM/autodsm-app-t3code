import { describe, expect, it } from "vitest";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import {
  AutoDsmBrandProfile,
  AutoDsmBrandTokenAddInput,
  type AutoDsmProjectProfile,
  decodeAutoDsmProjectProfileUnknown,
  encodeAutoDsmProjectProfile,
} from "./autodsmArtifacts.ts";

const encodeBrandProfile = Schema.encodeSync(AutoDsmBrandProfile);
const decodeBrandProfile = Schema.decodeUnknownSync(AutoDsmBrandProfile);
const decodeBrandTokenAddInput = Schema.decodeUnknownSync(AutoDsmBrandTokenAddInput);

const minimalProfile: AutoDsmProjectProfile = {
  meta: {
    kind: "project-profile",
    schemaVersion: 1,
    owner: "project-profile-indexer",
    invalidationKey: "inv-key",
    consumers: [],
  },
  workspaceRootFingerprint: "fp",
  packageManager: "npm",
  frameworks: [],
  monorepoWorkspacePatterns: [],
  typescriptProjectHints: [],
  tailwindHintPaths: [],
  componentRoots: [],
  packageVersions: {},
  status: "ready",
};

describe("autodsmArtifacts", () => {
  it("round-trips ProjectProfile encode/decode", async () => {
    const encoded = await Effect.runPromise(encodeAutoDsmProjectProfile(minimalProfile));
    const decoded = await Effect.runPromise(decodeAutoDsmProjectProfileUnknown(encoded));
    expect(decoded).toEqual(minimalProfile);
  });

  it("round-trips a BrandProfile with structured color + typography tokens", () => {
    const profile: AutoDsmBrandProfile = {
      meta: {
        kind: "brand-profile",
        schemaVersion: 2,
        owner: "brand-profile-indexer",
        invalidationKey: "inv-key",
        consumers: ["render-runtime"],
      },
      tokens: [
        {
          id: "css-var:primary",
          category: "color",
          name: "primary/50",
          value: "#8a38f5",
          color: { light: "#8a38f5", dark: "#a366ff" },
          origin: "scanned",
          sources: ["/src/index.css"],
        },
        {
          id: "user:heading-1",
          category: "typography",
          name: "Heading 1",
          value: "Manrope 64px",
          typography: { fontFamily: "Manrope", fontSize: "64px", letterSpacing: "0" },
          origin: "user",
          sources: [],
        },
      ],
      cssVariablePaths: ["/src/index.css"],
      status: "ready",
    };
    const encoded = encodeBrandProfile(profile);
    const decoded = decodeBrandProfile(encoded);
    expect(decoded).toEqual(profile);
  });

  it("decodes a valid brand token add input and rejects an unknown category", () => {
    const input = decodeBrandTokenAddInput({
      cwd: "/tmp/ws",
      token: { category: "spacing", name: "space-4", value: "16px" },
    });
    expect(input.token.category).toBe("spacing");
    expect(() =>
      decodeBrandTokenAddInput({
        cwd: "/tmp/ws",
        token: { category: "elevation", name: "x", value: "1" },
      }),
    ).toThrow();
  });
});
