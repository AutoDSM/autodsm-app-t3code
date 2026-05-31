import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearOAuthAccountHint,
  readOAuthAccountHint,
  rememberOAuthAccountHint,
} from "./oauthAccountHints";

const STORAGE_KEY = "autodsm.oauthAccountHints.v1";

function installLocalStorageMock(): void {
  const store = new Map<string, string>();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => {
        store.clear();
      },
    },
  });
}

describe("oauthAccountHints", () => {
  beforeEach(() => {
    installLocalStorageMock();
  });

  it("returns null when no hint is stored", () => {
    expect(readOAuthAccountHint("google")).toBeNull();
  });

  it("persists and reads provider email hints", () => {
    rememberOAuthAccountHint("google", "user@gmail.com");
    expect(readOAuthAccountHint("google")).toBe("user@gmail.com");
    expect(window.localStorage.getItem(STORAGE_KEY)).toContain("user@gmail.com");
  });

  it("clears a stored hint", () => {
    rememberOAuthAccountHint("google", "user@gmail.com");
    clearOAuthAccountHint("google");
    expect(readOAuthAccountHint("google")).toBeNull();
  });
});
