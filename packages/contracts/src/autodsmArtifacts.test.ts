import { describe, expect, it } from "vitest";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import {
  AutoDsmBrandProfile,
  AutoDsmBrandTokenAddInput,
  AutoDsmDesignBriefApplyInput,
  AutoDsmDesignBriefDoc,
  AutoDsmDesignBriefProposal,
  AutoDsmDesignBriefUploadInput,
  type AutoDsmProjectProfile,
  decodeAutoDsmProjectProfileUnknown,
  encodeAutoDsmProjectProfile,
} from "./autodsmArtifacts.ts";

const encodeBrandProfile = Schema.encodeSync(AutoDsmBrandProfile);
const decodeBrandProfile = Schema.decodeUnknownSync(AutoDsmBrandProfile);
const decodeBrandTokenAddInput = Schema.decodeUnknownSync(AutoDsmBrandTokenAddInput);
const decodeDesignBriefUploadInput = Schema.decodeUnknownSync(AutoDsmDesignBriefUploadInput);
const decodeDesignBriefProposal = Schema.decodeUnknownSync(AutoDsmDesignBriefProposal);
const decodeDesignBriefDoc = Schema.decodeUnknownSync(AutoDsmDesignBriefDoc);
const decodeDesignBriefApplyInput = Schema.decodeUnknownSync(AutoDsmDesignBriefApplyInput);

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

  describe("design brief schemas", () => {
    it("accepts upload input under the 128 KB cap and rejects oversize", () => {
      expect(() => decodeDesignBriefUploadInput({ cwd: "/tmp/ws", markdown: "hi" })).not.toThrow();
      expect(() =>
        decodeDesignBriefUploadInput({ cwd: "/tmp/ws", markdown: "x".repeat(131_072) }),
      ).not.toThrow();
      expect(() =>
        decodeDesignBriefUploadInput({ cwd: "/tmp/ws", markdown: "x".repeat(131_073) }),
      ).toThrow();
    });

    it("accepts the design-brief-store owner literal in the doc schema", () => {
      const doc = decodeDesignBriefDoc({
        meta: {
          kind: "design-brief-doc",
          schemaVersion: 1,
          owner: "design-brief-store",
          invalidationKey: "abc",
          consumers: [],
        },
        contentSha256: "x".repeat(64),
        byteLength: 12,
        uploadedAt: "2026-01-01T00:00:00.000Z",
      });
      expect(doc.meta.owner).toBe("design-brief-store");
    });

    it("round-trips a proposal with mixed add/update/remove ops", () => {
      const proposal = decodeDesignBriefProposal({
        proposalId: "p-1",
        createdAt: "2026-01-01T00:00:00.000Z",
        briefDigest: "x".repeat(64),
        basedOnInvalidationKey: "inv-key",
        summary: "warm earthy",
        operations: [
          {
            opId: "op-1",
            kind: "update",
            category: "color",
            tokenName: "primary",
            patch: { value: "#e2725b" },
            currentValue: "#3b82f6",
            proposedValue: "#e2725b",
          },
          {
            opId: "op-2",
            kind: "add",
            category: "typography",
            tokenName: "display",
            draft: { category: "typography", name: "display", value: "Fraunces 64px" },
          },
          {
            opId: "op-3",
            kind: "remove",
            category: "color",
            tokenName: "accent",
          },
        ],
      });
      expect(proposal.operations).toHaveLength(3);
      expect(proposal.operations[0]!.kind).toBe("update");
      expect(proposal.operations[1]!.draft?.name).toBe("display");
      expect(proposal.operations[2]!.kind).toBe("remove");
    });

    it("apply input accepts empty acceptedOpIds (no-op apply)", () => {
      const input = decodeDesignBriefApplyInput({
        cwd: "/tmp/ws",
        proposalId: "p-1",
        acceptedOpIds: [],
      });
      expect(input.acceptedOpIds).toHaveLength(0);
    });
  });
});
