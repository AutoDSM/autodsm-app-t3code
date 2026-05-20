import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import * as DesktopBackendManager from "../../backend/DesktopBackendManager.ts";
import * as IpcChannels from "../channels.ts";
import { makeIpcMethod } from "../DesktopIpc.ts";

export const restartDesktopBackend = makeIpcMethod({
  channel: IpcChannels.RESTART_DESKTOP_BACKEND_CHANNEL,
  payload: Schema.Void,
  result: Schema.Boolean,
  handler: Effect.fn("desktop.ipc.backend.restart")(function* () {
    const backendManager = yield* DesktopBackendManager.DesktopBackendManager;
    yield* backendManager.recover;
    return true;
  }),
});
