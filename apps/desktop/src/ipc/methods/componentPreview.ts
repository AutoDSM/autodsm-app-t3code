import * as Schema from "effect/Schema";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";

import * as ElectronWindow from "../../electron/ElectronWindow.ts";
import {
  attachPreviewView,
  capturePreviewView,
  detachAllPreviewViews,
  detachPreviewView,
  isWebContentsViewPreviewSupported,
  primePreviewView,
  setPreviewBounds,
  setPreviewTheme,
} from "../../componentPreview/componentPreviewViews.ts";

const PreviewThemeSchema = Schema.Literals(["light", "dark"]);
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
    const attached = yield* Effect.tryPromise({
      try: () =>
        attachPreviewView({
          browserWindow,
          viewId: input.viewId,
          url: input.url,
          bounds: input.bounds,
        }),
      catch: () => false,
    });
    if (!attached) {
      yield* Effect.logWarning("[desktop.ipc.componentPreview.attach] returned false").pipe(
        Effect.annotateLogs({
          viewId: input.viewId,
          url: input.url,
        }),
      );
    }
    return attached;
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
    detachPreviewView(input.viewId);
  }),
});

export const detachAllComponentPreview = makeIpcMethod({
  channel: IpcChannels.COMPONENT_PREVIEW_DETACH_ALL_CHANNEL,
  payload: Schema.Void,
  result: Schema.Void,
  handler: Effect.fn("desktop.ipc.componentPreview.detachAll")(function* () {
    yield* Effect.sync(() => {
      detachAllPreviewViews();
    });
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
    workspaceStyleCss: Schema.optional(Schema.String),
    resolvedTheme: Schema.optional(PreviewThemeSchema),
  }),
  result: Schema.Boolean,
  handler: Effect.fn("desktop.ipc.componentPreview.prime")(function* (input) {
    return yield* Effect.tryPromise({
      try: () =>
        primePreviewView(
          input.viewId,
          input.javascript,
          input.propsJson,
          input.workspaceStyleCss,
          input.resolvedTheme,
        ),
      catch: () => false,
    });
  }),
});

export const setComponentPreviewTheme = makeIpcMethod({
  channel: IpcChannels.COMPONENT_PREVIEW_SET_THEME_CHANNEL,
  payload: Schema.Struct({
    viewId: Schema.String,
    resolvedTheme: PreviewThemeSchema,
  }),
  result: Schema.Void,
  handler: Effect.fn("desktop.ipc.componentPreview.setTheme")(function* (input) {
    yield* Effect.tryPromise({
      try: () => setPreviewTheme(input.viewId, input.resolvedTheme),
      catch: () => undefined,
    });
  }),
});

export const captureComponentPreview = makeIpcMethod({
  channel: IpcChannels.COMPONENT_PREVIEW_CAPTURE_CHANNEL,
  payload: Schema.Struct({ viewId: Schema.String }),
  result: Schema.NullOr(Schema.String),
  handler: Effect.fn("desktop.ipc.componentPreview.capture")(function* (input) {
    if (!isWebContentsViewPreviewSupported()) {
      return null;
    }
    return yield* Effect.tryPromise({
      try: () => capturePreviewView(input.viewId),
      catch: () => null,
    });
  }),
});
