import * as Duration from "effect/Duration";

import type * as HttpServerRequest from "effect/unstable/http/HttpServerRequest";

import type { ServerConfigShape } from "../config.ts";
import { isLoopbackHost } from "../startupAccess.ts";
import { readRemoteAddressFromSource } from "./utils.ts";

/** Internal seeded credential consumed only by POST /api/auth/dev-auto-bootstrap. */
export const DEV_LOOPBACK_BYPASS_CREDENTIAL = "t3-dev-loopback-bypass";

export const DEV_LOOPBACK_BYPASS_TTL = Duration.days(365);

export function isDevPairingDisabled(
  config: Pick<ServerConfigShape, "devDisablePairing" | "devUrl" | "mode">,
): boolean {
  if (!config.devDisablePairing) {
    return false;
  }

  return config.devUrl !== undefined || config.mode === "desktop";
}

export function isLoopbackRemoteAddress(remoteAddress: string | undefined): boolean {
  if (!remoteAddress) {
    return false;
  }
  return isLoopbackHost(remoteAddress);
}

export function isLoopbackHttpRequest(request: HttpServerRequest.HttpServerRequest): boolean {
  return isLoopbackRemoteAddress(readRemoteAddressFromSource(request.source));
}
