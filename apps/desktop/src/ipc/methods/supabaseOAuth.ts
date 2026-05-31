import * as Effect from "effect/Effect";
import * as Option from "effect/Option";

import {
  DesktopSupabaseOAuthStartInputSchema,
  DesktopSupabaseOAuthStartResultSchema,
} from "@t3tools/contracts";

import * as ElectronWindow from "../../electron/ElectronWindow.ts";
import {
  runSupabaseOAuthInSystemBrowser,
  cancelActiveSupabaseOAuthBrowser,
} from "../../oauth/supabaseOAuthBrowser.ts";
import * as IpcChannels from "../channels.ts";
import { makeIpcMethod } from "../DesktopIpc.ts";

export const startSupabaseOAuth = makeIpcMethod({
  channel: IpcChannels.SUPABASE_OAUTH_START_CHANNEL,
  payload: DesktopSupabaseOAuthStartInputSchema,
  result: DesktopSupabaseOAuthStartResultSchema,
  handler: Effect.fn("desktop.ipc.supabaseOAuth.start")(function* (input) {
    const electronWindow = yield* ElectronWindow.ElectronWindow;
    const owner = yield* electronWindow.focusedMainOrFirst;
    if (Option.isNone(owner)) {
      return {
        ok: false as const,
        reason: "failed" as const,
        message: "Main window is unavailable.",
      };
    }

    const mainWindow = owner.value;

    const result = yield* Effect.tryPromise({
      try: () =>
        runSupabaseOAuthInSystemBrowser({
          oauthUrl: input.oauthUrl,
          redirectTo: input.redirectTo,
          onMainWindowClosed: (cancel) => {
            mainWindow.once("closed", cancel);
          },
        }),
      catch: (cause) => ({
        ok: false as const,
        reason: "failed" as const,
        message: cause instanceof Error ? cause.message : "OAuth sign-in failed.",
      }),
    });

    if (result.ok) {
      yield* electronWindow.reveal(mainWindow);
    }

    return result;
  }),
});
