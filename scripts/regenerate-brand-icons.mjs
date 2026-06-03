// Regenerates every committed app-icon / favicon asset from a single master PNG.
//
// All channels (dev / nightly / prod) and the marketing favicons now share the
// same AutoDSM artwork, so this script derives every format from
// `assets/AppIcon.png` and overwrites each existing asset *in place* — filenames
// are preserved so no build config or source code needs to change.
//
// Re-run after replacing assets/AppIcon.png:  node scripts/regenerate-brand-icons.mjs

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const master = join(repoRoot, "assets", "AppIcon.png");

// `assets/AppIcon.png` is full-bleed source art (the glyph on a background that
// fills the whole square — no baked rounded corners, padding, or shadow). Unlike
// iOS, macOS does NOT mask app icons, so macOS assets must bake in Apple's icon
// grid: an 824/1024 rounded-rect ("squircle") body centered on a transparent 1024
// canvas (see `macShapedMaster`). This is applied to the `.icns` dock icon, the
// desktop `icon.png`, and the macOS channel PNG. iOS, Windows `.ico`, and web
// favicons render full-bleed straight from the master.

if (!existsSync(master)) {
  console.error(`Master icon missing at ${master}`);
  process.exit(1);
}

function run(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.status !== 0) {
    const details = [result.stdout, result.stderr].filter(Boolean).join("\n");
    throw new Error(`Failed: ${command} ${args.join(" ")}\n${details}`.trim());
  }
}

/** Resize a source PNG to a square of `size` px (defaults to the full-bleed master). */
function png(size, dest, src = master) {
  mkdirSync(dirname(dest), { recursive: true });
  run("sips", ["-z", String(size), String(size), src, "--out", dest]);
  console.log(`  png  ${size}x${size}  ${rel(dest)}`);
}

/** Multi-size Windows / web .ico via ImageMagick. */
function ico(dest) {
  mkdirSync(dirname(dest), { recursive: true });
  run("magick", [master, "-define", "icon:auto-resize=16,24,32,48,64,128,256", dest]);
  console.log(`  ico            ${rel(dest)}`);
}

/** macOS .icns via an iconset + iconutil (same recipe as electron-launcher.mjs). */
function icns(dest, src = master) {
  mkdirSync(dirname(dest), { recursive: true });
  const root = mkdtempSync(join(tmpdir(), "autodsm-iconset-"));
  const iconset = join(root, "icon.iconset");
  mkdirSync(iconset, { recursive: true });
  try {
    for (const size of [16, 32, 128, 256, 512]) {
      run("sips", [
        "-z",
        String(size),
        String(size),
        src,
        "--out",
        join(iconset, `icon_${size}x${size}.png`),
      ]);
      const r = size * 2;
      run("sips", [
        "-z",
        String(r),
        String(r),
        src,
        "--out",
        join(iconset, `icon_${size}x${size}@2x.png`),
      ]);
    }
    run("iconutil", ["-c", "icns", iconset, "-o", dest]);
    console.log(`  icns           ${rel(dest)}`);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

// macOS Big Sur app-icon grid: a rounded-rect body 824px on a 1024px canvas
// (≈100px transparent margin per side) with a 185.4px corner radius.
const MAC_CANVAS = 1024;
const MAC_BODY = 824;
const MAC_RADIUS = 185;

let macShapedCache = null;
const macTempDirs = [];

/**
 * Build (once) a macOS-grid-shaped 1024 master from the full-bleed art: scale to
 * the 824 body, round to the macOS corner radius, and center on a transparent
 * 1024 canvas. Feed this to `png`/`icns` for macOS so the dock icon matches other
 * native apps (correct size + squircle) instead of rendering as a flat square.
 */
function macShapedMaster() {
  if (macShapedCache) {
    return macShapedCache;
  }
  const dir = mkdtempSync(join(tmpdir(), "autodsm-mac-icon-"));
  macTempDirs.push(dir);
  const art = join(dir, "art.png");
  const mask = join(dir, "mask.png");
  const rounded = join(dir, "rounded.png");
  const out = join(dir, "mac-1024.png");
  // 1. Scale the art to the 824 body.
  run("magick", [master, "-resize", `${MAC_BODY}x${MAC_BODY}!`, art]);
  // 2. Build an opaque-white rounded-rect mask on a transparent canvas.
  run("magick", [
    "-size",
    `${MAC_BODY}x${MAC_BODY}`,
    "xc:none",
    "-fill",
    "white",
    "-draw",
    `roundrectangle 0,0,${MAC_BODY - 1},${MAC_BODY - 1},${MAC_RADIUS},${MAC_RADIUS}`,
    mask,
  ]);
  // 3. Round the art via the mask's alpha (DstIn keeps art only inside the rect).
  run("magick", [art, mask, "-alpha", "set", "-compose", "DstIn", "-composite", rounded]);
  // 4. Center the rounded body on a transparent 1024 canvas (separate invocation
  //    so the DstIn compose operator above can't corrupt the extent step).
  run("magick", [
    rounded,
    "-background",
    "none",
    "-gravity",
    "center",
    "-extent",
    `${MAC_CANVAS}x${MAC_CANVAS}`,
    out,
  ]);
  macShapedCache = out;
  return out;
}

/** WebP from a freshly-resized square PNG. */
function webp(size, dest) {
  mkdirSync(dirname(dest), { recursive: true });
  run("magick", [master, "-resize", `${size}x${size}`, dest]);
  console.log(`  webp ${String(size).padStart(4)}     ${rel(dest)}`);
}

function rel(p) {
  return p.startsWith(repoRoot) ? p.slice(repoRoot.length + 1) : p;
}

function a(...parts) {
  return join(repoRoot, "assets", ...parts);
}
function app(...parts) {
  return join(repoRoot, "apps", ...parts);
}

// --- Channel asset sets (dev / nightly use blueprint-*, prod uses t3-black-*/black-*) ---
const channels = [
  { dir: "dev", master512: "blueprint-macos-1024.png", names: blueprintNames() },
  { dir: "nightly", names: blueprintNames() },
  { dir: "prod", names: prodNames() },
];

function blueprintNames() {
  return {
    macos: "blueprint-macos-1024.png",
    universal: "blueprint-universal-1024.png",
    ios: "blueprint-ios-1024.png",
    windowsIco: "blueprint-windows.ico",
    faviconIco: "blueprint-web-favicon.ico",
    favicon16: "blueprint-web-favicon-16x16.png",
    favicon32: "blueprint-web-favicon-32x32.png",
    appleTouch: "blueprint-web-apple-touch-180.png",
  };
}
function prodNames() {
  return {
    macos: "black-macos-1024.png",
    universal: "black-universal-1024.png",
    ios: "black-ios-1024.png",
    windowsIco: "t3-black-windows.ico",
    faviconIco: "t3-black-web-favicon.ico",
    favicon16: "t3-black-web-favicon-16x16.png",
    favicon32: "t3-black-web-favicon-32x32.png",
    appleTouch: "t3-black-web-apple-touch-180.png",
  };
}

console.log("Regenerating channel assets from assets/AppIcon.png");

for (const { dir, names } of channels) {
  console.log(`assets/${dir}/`);
  png(1024, a(dir, names.macos), macShapedMaster());
  png(1024, a(dir, names.universal));
  png(1024, a(dir, names.ios));
  png(180, a(dir, names.appleTouch));
  png(32, a(dir, names.favicon32));
  png(16, a(dir, names.favicon16));
  ico(a(dir, names.windowsIco));
  ico(a(dir, names.faviconIco));
}

console.log("apps/desktop/resources/");
png(512, app("desktop", "resources", "icon.png"), macShapedMaster());
icns(app("desktop", "resources", "icon.icns"), macShapedMaster());
ico(app("desktop", "resources", "icon.ico"));

console.log("apps/marketing/public/");
const pub = (...p) => app("marketing", "public", ...p);
png(180, pub("apple-touch-icon.png"));
png(32, pub("favicon-32x32.png"));
png(16, pub("favicon-16x16.png"));
png(512, pub("icon.png"));
ico(pub("favicon.ico"));
webp(180, pub("apple-touch-icon.webp"));
webp(32, pub("favicon-32x32.webp"));
webp(16, pub("favicon-16x16.webp"));
webp(512, pub("icon.webp"));

for (const dir of macTempDirs) {
  rmSync(dir, { recursive: true, force: true });
}

console.log("Done.");
