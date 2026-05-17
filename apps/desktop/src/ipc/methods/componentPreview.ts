import * as Schema from "effect/Schema";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";

import * as ElectronWindow from "../../electron/ElectronWindow.ts";
import {
  attachPreviewView,
  detachPreviewView,
  isWebContentsViewPreviewSupported,
  primePreviewView,
  setPreviewBounds,
} from "../../componentPreview/componentPreviewViews.ts";
import * as IpcChannels from "../channels.ts";
import { makeIpcMethod } from "../DesktopIpc.ts";

const PreviewBoundsSchema = Schema.Struct({
  x: Schema.Number,
  y: Schema.Number,
  width: Schema.Number,
  height: Schema.Number,
});

const AttachPayload = Schema.Struct({
  viewId: Schema.String,
  url: Schema.String,
  bounds: PreviewBoundsSchema,
});

export const attachComponentPreview = makeIpcMethod({
  channel: IpcChannels.COMPONENT_PREVIEW_ATTACH_CHANNEL,
  payload: AttachPayload,
  result: Schema.Boolean,
  handler: Effect.fn("desktop.ipc.componentPreview.attach")(function* (input) {
    if (!isWebContentsViewPreviewSupported()) {
      return false;
    }
    const electronWindow = yield* ElectronWindow.ElectronWindow;
    const owner = yield* electronWindow.focusedMainOrFirst;
    if (Option.isNone(owner)) {
      return false;
    }
    const browserWindow = owner.value;
    return yield* Effect.tryPromise({
      try: () =>
        attachPreviewView({
          browserWindow,
          viewId: input.viewId,
          url: input.url,
          bounds: input.bounds,
        }),
      catch: () => false,
    });
  }),
});

export const detachComponentPreview = makeIpcMethod({
  channel: IpcChannels.COMPONENT_PREVIEW_DETACH_CHANNEL,
  payload: Schema.Struct({ viewId: Schema.String }),
  result: Schema.Void,
  handler: Effect.fn("desktop.ipc.componentPreview.detach")(function* (input) {
    const electronWindow = yield* ElectronWindow.ElectronWindow;
    const owner = yield* electronWindow.focusedMainOrFirst;
    if (Option.isNone(owner)) {
      return;
    }
    detachPreviewView(owner.value, input.viewId);
  }),
});

export const setComponentPreviewBounds = makeIpcMethod({
  channel: IpcChannels.COMPONENT_PREVIEW_SET_BOUNDS_CHANNEL,
  payload: Schema.Struct({
    viewId: Schema.String,
    bounds: PreviewBoundsSchema,
  }),
  result: Schema.Void,
  handler: (input) =>
    Effect.sync(() => {
      setPreviewBounds(input.viewId, input.bounds);
    }),
});

export const primeComponentPreview = makeIpcMethod({
  channel: IpcChannels.COMPONENT_PREVIEW_PRIME_CHANNEL,
  payload: Schema.Struct({
    viewId: Schema.String,
    javascript: Schema.String,
    propsJson: Schema.String,
  }),
  result: Schema.Boolean,
  handler: Effect.fn("desktop.ipc.componentPreview.prime")(function* (input) {
    return yield* Effect.tryPromise({
      try: () => primePreviewView(input.viewId, input.javascript, input.propsJson),
      catch: () => false,
    });
  }),
});
