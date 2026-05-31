import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import { cancelActiveSupabaseOAuthBrowser } from "../../oauth/supabaseOAuthBrowser.ts";
import * as IpcChannels from "../channels.ts";
import { makeIpcMethod } from "../DesktopIpc.ts";

export const cancelSupabaseOAuth = makeIpcMethod({
  channel: IpcChannels.SUPABASE_OAUTH_CANCEL_CHANNEL,
  payload: Schema.Void,
  result: Schema.Void,
  handler: Effect.fn("desktop.ipc.supabaseOAuth.cancel")(function* () {
    cancelActiveSupabaseOAuthBrowser();
  }),
});
