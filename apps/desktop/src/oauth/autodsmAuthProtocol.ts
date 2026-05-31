import * as Electron from "electron";

export const AUTODSM_SCHEME = "autodsm";
export const AUTODSM_AUTH_SUCCESS_URL = `${AUTODSM_SCHEME}://auth/success`;

/** Register autodsm:// before app.ready so deep links can focus the desktop app. */
export function registerAutodsmAuthSchemePrivileges(): void {
  Electron.protocol.registerSchemesAsPrivileged([
    {
      scheme: AUTODSM_SCHEME,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: false,
        corsEnabled: false,
      },
    },
  ]);
}

export function registerAutodsmAuthProtocolClient(): void {
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      Electron.app.setAsDefaultProtocolClient(AUTODSM_SCHEME, process.execPath, [process.argv[1]!]);
    }
  } else {
    Electron.app.setAsDefaultProtocolClient(AUTODSM_SCHEME);
  }
}

export function isAutodsmAuthSuccessDeepLink(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== `${AUTODSM_SCHEME}:`) {
      return false;
    }
    const path = `${parsed.host}${parsed.pathname}`.replace(/^\/+/, "").replace(/\/+$/, "");
    return path === "auth/success";
  } catch {
    return false;
  }
}

export function extractAutodsmDeepLinkFromArgv(argv: readonly string[]): string | null {
  for (const arg of argv) {
    if (typeof arg === "string" && arg.startsWith(`${AUTODSM_SCHEME}://`)) {
      return arg;
    }
  }
  return null;
}
