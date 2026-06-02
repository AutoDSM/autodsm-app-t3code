// This file mostly exists because we want dev mode to say "AutoDSM (Dev)" instead of "electron"

import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const isDevelopment = Boolean(process.env.VITE_DEV_SERVER_URL);
const APP_DISPLAY_NAME = isDevelopment ? "AutoDSM (Dev)" : "AutoDSM (Alpha)";
const APP_BUNDLE_ID = isDevelopment ? "com.autodsm.app.dev" : "com.autodsm.app";
const LAUNCHER_VERSION = 4;

const __dirname = dirname(fileURLToPath(import.meta.url));
export const desktopDir = resolve(__dirname, "..");
const repoRoot = resolve(desktopDir, "..", "..");
const defaultIconPath = join(desktopDir, "resources", "icon.icns");
const developmentMacIconPngPath = join(repoRoot, "assets", "dev", "blueprint-macos-1024.png");

function setPlistString(plistPath, key, value) {
  const replaceResult = spawnSync("plutil", ["-replace", key, "-string", value, plistPath], {
    encoding: "utf8",
  });
  if (replaceResult.status === 0) {
    return;
  }

  const insertResult = spawnSync("plutil", ["-insert", key, "-string", value, plistPath], {
    encoding: "utf8",
  });
  if (insertResult.status === 0) {
    return;
  }

  const details = [replaceResult.stderr, insertResult.stderr].filter(Boolean).join("\n");
  throw new Error(`Failed to update plist key "${key}" at ${plistPath}: ${details}`.trim());
}

function runChecked(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.status === 0) {
    return;
  }

  const details = [result.stdout, result.stderr].filter(Boolean).join("\n");
  throw new Error(`Failed to run ${command} ${args.join(" ")}: ${details}`.trim());
}

function ensureDevelopmentIconIcns(runtimeDir) {
  const generatedIconPath = join(runtimeDir, "icon-dev.icns");
  mkdirSync(runtimeDir, { recursive: true });

  if (!existsSync(developmentMacIconPngPath)) {
    return defaultIconPath;
  }

  const sourceMtimeMs = statSync(developmentMacIconPngPath).mtimeMs;
  if (existsSync(generatedIconPath) && statSync(generatedIconPath).mtimeMs >= sourceMtimeMs) {
    return generatedIconPath;
  }

  const iconsetRoot = mkdtempSync(join(runtimeDir, "dev-iconset-"));
  const iconsetDir = join(iconsetRoot, "icon.iconset");
  mkdirSync(iconsetDir, { recursive: true });

  try {
    for (const size of [16, 32, 128, 256, 512]) {
      runChecked("sips", [
        "-z",
        String(size),
        String(size),
        developmentMacIconPngPath,
        "--out",
        join(iconsetDir, `icon_${size}x${size}.png`),
      ]);

      const retinaSize = size * 2;
      runChecked("sips", [
        "-z",
        String(retinaSize),
        String(retinaSize),
        developmentMacIconPngPath,
        "--out",
        join(iconsetDir, `icon_${size}x${size}@2x.png`),
      ]);
    }

    runChecked("iconutil", ["-c", "icns", iconsetDir, "-o", generatedIconPath]);
    return generatedIconPath;
  } catch (error) {
    console.warn(
      "[desktop-launcher] Failed to generate dev macOS icon, falling back to default icon.",
      error,
    );
    return defaultIconPath;
  } finally {
    rmSync(iconsetRoot, { recursive: true, force: true });
  }
}

function patchMainBundleInfoPlist(appBundlePath, iconPath) {
  const infoPlistPath = join(appBundlePath, "Contents", "Info.plist");
  setPlistString(infoPlistPath, "CFBundleDisplayName", APP_DISPLAY_NAME);
  setPlistString(infoPlistPath, "CFBundleName", APP_DISPLAY_NAME);
  setPlistString(infoPlistPath, "CFBundleIdentifier", APP_BUNDLE_ID);
  setPlistString(infoPlistPath, "CFBundleIconFile", "icon.icns");

  const resourcesDir = join(appBundlePath, "Contents", "Resources");
  copyFileSync(iconPath, join(resourcesDir, "icon.icns"));
  copyFileSync(iconPath, join(resourcesDir, "electron.icns"));
}

// Stock Electron uses the same helper bundle id for every helper process.
const HELPER_BUNDLE_ID = `${APP_BUNDLE_ID}.helper`;
const HELPER_APP_NAMES = [
  "Electron Helper.app",
  "Electron Helper (GPU).app",
  "Electron Helper (Renderer).app",
  "Electron Helper (Plugin).app",
];

function patchHelperBundleInfoPlists(appBundlePath) {
  for (const helperApp of HELPER_APP_NAMES) {
    const infoPlistPath = join(
      appBundlePath,
      "Contents/Frameworks",
      helperApp,
      "Contents/Info.plist",
    );
    if (existsSync(infoPlistPath)) {
      setPlistString(infoPlistPath, "CFBundleIdentifier", HELPER_BUNDLE_ID);
    }
  }
}

function helpersMatchExpected(appBundlePath) {
  for (const helperApp of HELPER_APP_NAMES) {
    const plistPath = join(appBundlePath, "Contents/Frameworks", helperApp, "Contents/Info.plist");
    if (!existsSync(plistPath)) {
      continue;
    }

    const idResult = spawnSync(
      "plutil",
      ["-extract", "CFBundleIdentifier", "raw", "-o", "-", plistPath],
      { encoding: "utf8" },
    );
    if (idResult.status !== 0 || idResult.stdout.trim() !== HELPER_BUNDLE_ID) {
      return false;
    }
  }

  return true;
}

function adHocCodesignAppBundle(appBundlePath) {
  runChecked("codesign", ["--force", "--deep", "-s", "-", appBundlePath]);
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function buildMacLauncher(electronBinaryPath) {
  const sourceAppBundlePath = resolve(electronBinaryPath, "../../..");
  const runtimeDir = join(desktopDir, ".electron-runtime");
  const targetAppBundlePath = join(runtimeDir, `${APP_DISPLAY_NAME}.app`);
  const targetBinaryPath = join(targetAppBundlePath, "Contents", "MacOS", "Electron");
  const iconPath = isDevelopment ? ensureDevelopmentIconIcns(runtimeDir) : defaultIconPath;
  const metadataPath = join(runtimeDir, "metadata.json");

  mkdirSync(runtimeDir, { recursive: true });

  const expectedMetadata = {
    launcherVersion: LAUNCHER_VERSION,
    sourceAppBundlePath,
    sourceAppMtimeMs: statSync(sourceAppBundlePath).mtimeMs,
    iconMtimeMs: statSync(iconPath).mtimeMs,
  };

  const currentMetadata = readJson(metadataPath);
  let cacheHit =
    existsSync(targetBinaryPath) &&
    currentMetadata &&
    JSON.stringify(currentMetadata) === JSON.stringify(expectedMetadata);

  if (cacheHit && !helpersMatchExpected(targetAppBundlePath)) {
    cacheHit = false;
  }

  if (cacheHit) {
    return targetBinaryPath;
  }

  rmSync(targetAppBundlePath, { recursive: true, force: true });
  if (process.platform === "darwin") {
    runChecked("ditto", [sourceAppBundlePath, targetAppBundlePath]);
  } else {
    cpSync(sourceAppBundlePath, targetAppBundlePath, { recursive: true });
  }
  patchMainBundleInfoPlist(targetAppBundlePath, iconPath);
  patchHelperBundleInfoPlists(targetAppBundlePath);
  adHocCodesignAppBundle(targetAppBundlePath);
  writeFileSync(metadataPath, `${JSON.stringify(expectedMetadata, null, 2)}\n`);

  return targetBinaryPath;
}

/** Last resolved launch metadata (for dev-electron startup logs). */
let lastLaunchInfo = null;

export function getElectronLaunchInfo() {
  return lastLaunchInfo;
}

export function resolveElectronPath() {
  const require = createRequire(import.meta.url);
  const electronBinaryPath = require("electron");

  if (process.platform !== "darwin") {
    lastLaunchInfo = {
      platform: process.platform,
      binaryPath: electronBinaryPath,
      bundleId: "com.github.Electron",
      appBundlePath: null,
      usesCopiedMacApp: false,
      isDevelopment,
    };
    return electronBinaryPath;
  }

  // Always use a copied .app with a distinct CFBundleIdentifier. Stock
  // `com.github.Electron` dev launches have been observed to abort() inside
  // HIServices `_RegisterApplication` / `NSApplication` init on newer macOS
  // (Launch Services registration), especially when spawned from IDE tooling.
  const resolved = buildMacLauncher(electronBinaryPath);
  const appBundlePath = resolve(resolved, "../../..");
  lastLaunchInfo = {
    platform: process.platform,
    binaryPath: resolved,
    bundleId: APP_BUNDLE_ID,
    appBundlePath,
    usesCopiedMacApp: true,
    isDevelopment,
  };
  console.info(
    `[desktop-launcher] resolved electron binary=${resolved} bundleId=${APP_BUNDLE_ID} app=${appBundlePath}`,
  );
  return resolved;
}
