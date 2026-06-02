// @effect-diagnostics nodeBuiltinImport:off
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  disposeAllAutodsmPreviewSidecars,
  peekAutodsmPreviewSidecar,
  startAutodsmPreviewSidecar,
} from "./autodsmVitePreviewSidecar.ts";

const dirs: string[] = [];

afterEach(async () => {
  await disposeAllAutodsmPreviewSidecars();
  for (const dir of dirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("disposeAllAutodsmPreviewSidecars", () => {
  it("disposes every running sidecar and clears the registry", async () => {
    const a = mkdtempSync(path.join(tmpdir(), "t3-sidecar-a-"));
    const b = mkdtempSync(path.join(tmpdir(), "t3-sidecar-b-"));
    dirs.push(a, b);

    const sidecarA = await startAutodsmPreviewSidecar(a);
    const sidecarB = await startAutodsmPreviewSidecar(b);
    expect(sidecarA.port).toBeGreaterThan(0);
    expect(sidecarB.port).toBeGreaterThan(0);
    expect(peekAutodsmPreviewSidecar(a)).toBeDefined();
    expect(peekAutodsmPreviewSidecar(b)).toBeDefined();

    await disposeAllAutodsmPreviewSidecars();

    expect(peekAutodsmPreviewSidecar(a)).toBeUndefined();
    expect(peekAutodsmPreviewSidecar(b)).toBeUndefined();
  });

  it("is a no-op when no sidecars are running", async () => {
    await expect(disposeAllAutodsmPreviewSidecars()).resolves.toBeUndefined();
  });
});
