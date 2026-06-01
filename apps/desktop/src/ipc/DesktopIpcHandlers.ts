import * as Effect from "effect/Effect";

import * as DesktopIpc from "./DesktopIpc.ts";
import { getClientSettings, setClientSettings } from "./methods/clientSettings.ts";
import {
  getSavedEnvironmentRegistry,
  getSavedEnvironmentSecret,
  removeSavedEnvironmentSecret,
  setSavedEnvironmentRegistry,
  setSavedEnvironmentSecret,
} from "./methods/savedEnvironments.ts";
import {
  getAdvertisedEndpoints,
  getServerExposureState,
  setServerExposureMode,
  setTailscaleServeEnabled,
} from "./methods/serverExposure.ts";
import {
  bootstrapSshBearerSession,
  disconnectSshEnvironment,
  discoverSshHosts,
  ensureSshEnvironment,
  fetchSshEnvironmentDescriptor,
  fetchSshSessionState,
  issueSshWebSocketToken,
  resolveSshPasswordPrompt,
} from "./methods/sshEnvironment.ts";
import {
  checkForUpdate,
  downloadUpdate,
  getUpdateState,
  installUpdate,
  setUpdateChannel,
} from "./methods/updates.ts";
import {
  attachComponentPreview,
  captureComponentPreview,
  detachAllComponentPreview,
  detachComponentPreview,
  primeComponentPreview,
  setComponentPreviewBounds,
  setComponentPreviewTheme,
} from "./methods/componentPreview.ts";
import { startSupabaseOAuth } from "./methods/supabaseOAuth.ts";
import { cancelSupabaseOAuth } from "./methods/supabaseOAuthCancel.ts";
import { restartDesktopBackend } from "./methods/backend.ts";
import {
  confirm,
  getAppBranding,
  getLocalEnvironmentBootstrap,
  openExternal,
  pickFolder,
  setTheme,
  showContextMenu,
} from "./methods/window.ts";

export const installDesktopIpcHandlers = Effect.gen(function* () {
  const ipc = yield* DesktopIpc.DesktopIpc;

  // Process-lifetime handlers: scoped cleanup removes listeners during shutdown while
  // the renderer can still call sync IPC (e.g. branding), causing sendSync warnings.
  yield* ipc.handleSyncForever(getAppBranding);
  yield* ipc.handleSyncForever(getLocalEnvironmentBootstrap);

  yield* ipc.handleForever(getClientSettings);
  yield* ipc.handleForever(setClientSettings);
  yield* ipc.handleForever(getSavedEnvironmentRegistry);
  yield* ipc.handleForever(setSavedEnvironmentRegistry);
  yield* ipc.handleForever(getSavedEnvironmentSecret);
  yield* ipc.handleForever(setSavedEnvironmentSecret);
  yield* ipc.handleForever(removeSavedEnvironmentSecret);

  yield* ipc.handleForever(discoverSshHosts);
  yield* ipc.handleForever(ensureSshEnvironment);
  yield* ipc.handleForever(disconnectSshEnvironment);
  yield* ipc.handleForever(fetchSshEnvironmentDescriptor);
  yield* ipc.handleForever(bootstrapSshBearerSession);
  yield* ipc.handleForever(fetchSshSessionState);
  yield* ipc.handleForever(issueSshWebSocketToken);
  yield* ipc.handleForever(resolveSshPasswordPrompt);

  yield* ipc.handleForever(getServerExposureState);
  yield* ipc.handleForever(setServerExposureMode);
  yield* ipc.handleForever(setTailscaleServeEnabled);
  yield* ipc.handleForever(getAdvertisedEndpoints);

  yield* ipc.handleForever(pickFolder);
  yield* ipc.handleForever(confirm);
  yield* ipc.handleForever(setTheme);
  yield* ipc.handleForever(showContextMenu);
  yield* ipc.handleForever(openExternal);

  yield* ipc.handleForever(attachComponentPreview);
  yield* ipc.handleForever(detachComponentPreview);
  yield* ipc.handleForever(detachAllComponentPreview);
  yield* ipc.handleForever(setComponentPreviewBounds);
  yield* ipc.handleForever(primeComponentPreview);
  yield* ipc.handleForever(setComponentPreviewTheme);
  yield* ipc.handleForever(captureComponentPreview);
  yield* ipc.handleForever(startSupabaseOAuth);
  yield* ipc.handleForever(cancelSupabaseOAuth);
  yield* ipc.handleForever(restartDesktopBackend);

  yield* ipc.handleForever(getUpdateState);
  yield* ipc.handleForever(setUpdateChannel);
  yield* ipc.handleForever(downloadUpdate);
  yield* ipc.handleForever(installUpdate);
  yield* ipc.handleForever(checkForUpdate);
}).pipe(Effect.withSpan("desktop.ipc.installHandlers"));
