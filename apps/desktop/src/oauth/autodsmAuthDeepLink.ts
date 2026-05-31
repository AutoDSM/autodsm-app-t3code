import * as Effect from "effect/Effect";
import * as Option from "effect/Option";

import * as ElectronWindow from "../electron/ElectronWindow.ts";
import {
  extractAutodsmDeepLinkFromArgv,
  isAutodsmAuthSuccessDeepLink,
} from "./autodsmAuthProtocol.ts";

let pendingAuthSuccessDeepLink = false;

export function markAutodsmAuthSuccessDeepLinkPending(): void {
  pendingAuthSuccessDeepLink = true;
}

export function consumeAutodsmAuthSuccessDeepLinkPending(): boolean {
  const pending = pendingAuthSuccessDeepLink;
  pendingAuthSuccessDeepLink = false;
  return pending;
}

const revealMainWindowForAuthSuccess = Effect.gen(function* () {
  const electronWindow = yield* ElectronWindow.ElectronWindow;
  const owner = yield* electronWindow.focusedMainOrFirst;
  if (Option.isSome(owner)) {
    yield* electronWindow.reveal(owner.value);
  }
});

export function handleAutodsmAuthDeepLink(rawUrl: string): void {
  if (!isAutodsmAuthSuccessDeepLink(rawUrl)) {
    return;
  }
  markAutodsmAuthSuccessDeepLinkPending();
}

export function handleAutodsmAuthDeepLinkArgv(argv: readonly string[]): void {
  const deepLink = extractAutodsmDeepLinkFromArgv(argv);
  if (deepLink) {
    handleAutodsmAuthDeepLink(deepLink);
  }
}

export const autodsmAuthDeepLinkRevealEffect = Effect.gen(function* () {
  if (!consumeAutodsmAuthSuccessDeepLinkPending()) {
    return;
  }
  yield* revealMainWindowForAuthSuccess;
});
