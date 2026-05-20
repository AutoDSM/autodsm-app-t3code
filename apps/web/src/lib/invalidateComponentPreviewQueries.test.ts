import { EnvironmentId } from "@t3tools/contracts";
import { describe, expect, it, vi } from "vitest";

import { invalidateComponentPreviewQueries } from "./invalidateComponentPreviewQueries";

describe("invalidateComponentPreviewQueries", () => {
  it("invalidates path-scoped preview queries when relativePath is provided", () => {
    const invalidateQueries = vi.fn();
    const queryClient = { invalidateQueries } as never;

    invalidateComponentPreviewQueries(queryClient, {
      environmentId: EnvironmentId.make("env-1"),
      projectCwd: "/tmp/workspace",
      relativePath: "src/components/ui/button.tsx",
    });

    expect(invalidateQueries).toHaveBeenCalledTimes(3);
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: [
        "component-preview-manifest",
        EnvironmentId.make("env-1"),
        "/tmp/workspace",
        "src/components/ui/button.tsx",
      ],
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: [
        "component-preview-bundle",
        EnvironmentId.make("env-1"),
        "/tmp/workspace",
        "src/components/ui/button.tsx",
      ],
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: [
        "component-preview-execute-render-plan",
        EnvironmentId.make("env-1"),
        "/tmp/workspace",
      ],
    });
  });

  it("invalidates broad preview queries when relativePath is omitted", () => {
    const invalidateQueries = vi.fn();
    const queryClient = { invalidateQueries } as never;

    invalidateComponentPreviewQueries(queryClient, {
      environmentId: EnvironmentId.make("env-1"),
      projectCwd: "/tmp/workspace",
    });

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["component-preview-manifest"],
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["component-preview-bundle"],
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["component-preview-execute-render-plan"],
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["autodsm", "component-registry", EnvironmentId.make("env-1"), "/tmp/workspace"],
    });
  });
});
