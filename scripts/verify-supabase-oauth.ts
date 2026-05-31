#!/usr/bin/env bun
/**
 * Phase 1 OAuth readiness checks — env, hosted Supabase reachability, and schema tables.
 * Run: bun scripts/verify-supabase-oauth.ts
 * Manual OAuth smoke (GitHub/Google in browser/Electron) still required after dashboard setup.
 */

// @effect-diagnostics nodeBuiltinImport:off globalConsole:off
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_REF = "mujlucfkoqvghvdikkhw";
const REQUIRED_REDIRECT_URLS = [
  "http://localhost:5733/auth/callback",
  "http://127.0.0.1:5733/auth/callback",
  "http://127.0.0.1:53682/auth/callback",
  "http://127.0.0.1:3773/auth/callback",
] as const;

type CheckResult = { name: string; ok: boolean; detail: string };

function scriptDir(): string {
  return fileURLToPath(new URL(".", import.meta.url));
}

function loadWebEnv(): Record<string, string> {
  const envPath = resolve(scriptDir(), "../apps/web/.env");
  if (!existsSync(envPath)) {
    return {};
  }
  const out: Record<string, string> = {};
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    out[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }
  return out;
}

function checkEnv(env: Record<string, string>): CheckResult[] {
  const url = env.VITE_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
  const results: CheckResult[] = [];

  results.push({
    name: "VITE_SUPABASE_URL",
    ok: Boolean(url && url.includes(PROJECT_REF)),
    detail: url ? `set (${url})` : "missing — copy apps/web/.env.example → apps/web/.env",
  });

  results.push({
    name: "VITE_SUPABASE_ANON_KEY",
    ok: Boolean(key && key.length > 20 && !key.includes("your_publishable")),
    detail: key ? "set" : "missing — use Supabase Dashboard → Project Settings → API",
  });

  return results;
}

async function checkOAuthAuthorizeUrls(url: string, anonKey: string): Promise<CheckResult[]> {
  const base = url.replace(/\/$/, "");
  const providers = ["github", "google"] as const;
  const results: CheckResult[] = [];

  for (const provider of providers) {
    try {
      const authorizeUrl = new URL(`${base}/auth/v1/authorize`);
      authorizeUrl.searchParams.set("provider", provider);
      authorizeUrl.searchParams.set("redirect_to", "http://localhost:5733/auth/callback");

      const res = await fetch(authorizeUrl.toString(), {
        method: "GET",
        redirect: "manual",
        headers: { apikey: anonKey },
      });

      const location = res.headers.get("location") ?? "";
      const ok = res.status === 302 && location.length > 0;
      results.push({
        name: `OAuth authorize (${provider})`,
        ok,
        detail: ok
          ? `302 → ${location.slice(0, 60)}…`
          : `${res.status} — provider or redirect URL misconfigured`,
      });
    } catch (error) {
      results.push({
        name: `OAuth authorize (${provider})`,
        ok: false,
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
}

async function checkAuthProviders(url: string, anonKey: string): Promise<CheckResult> {
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/auth/v1/settings`, {
      headers: { apikey: anonKey },
    });
    if (!res.ok) {
      return {
        name: "OAuth providers (GitHub + Google)",
        ok: false,
        detail: `${res.status} — check Supabase Dashboard → Authentication → Providers`,
      };
    }
    const settings = (await res.json()) as { external?: { github?: boolean; google?: boolean } };
    const github = settings.external?.github === true;
    const google = settings.external?.google === true;
    return {
      name: "OAuth providers (GitHub + Google)",
      ok: github && google,
      detail:
        github && google ? "enabled" : `github=${github} google=${google} — enable in dashboard`,
    };
  } catch (error) {
    return {
      name: "OAuth providers (GitHub + Google)",
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

async function checkSupabaseHealth(url: string, anonKey: string): Promise<CheckResult> {
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/auth/v1/health`, {
      headers: { apikey: anonKey },
    });
    return {
      name: "Supabase auth health",
      ok: res.ok,
      detail: res.ok ? `${res.status} OK` : `${res.status} ${await res.text()}`,
    };
  } catch (error) {
    return {
      name: "Supabase auth health",
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

async function checkSchemaTables(url: string, anonKey: string): Promise<CheckResult[]> {
  const headers = {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    Accept: "application/json",
  };
  const tables = ["profiles", "telemetry_events", "feedback_submissions", "publish_stats"] as const;
  const results: CheckResult[] = [];

  for (const table of tables) {
    try {
      const res = await fetch(`${url.replace(/\/$/, "")}/rest/v1/${table}?select=id&limit=0`, {
        headers,
      });
      // 200 or 401 (RLS) both mean the table exists
      const ok = res.status === 200 || res.status === 401 || res.status === 406;
      results.push({
        name: `table public.${table}`,
        ok,
        detail: ok ? "reachable" : `${res.status} — run supabase db push`,
      });
    } catch (error) {
      results.push({
        name: `table public.${table}`,
        ok: false,
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
}

function checkRedirectDocs(): CheckResult {
  const readme = readFileSync(resolve(scriptDir(), "../supabase/README.md"), "utf8");
  const missing = REQUIRED_REDIRECT_URLS.filter((u) => !readme.includes(u));
  return {
    name: "Redirect URLs documented",
    ok: missing.length === 0,
    detail:
      missing.length === 0 ? "all three in supabase/README.md" : `missing: ${missing.join(", ")}`,
  };
}

async function main() {
  const env = loadWebEnv();
  const checks: CheckResult[] = [...checkEnv(env), checkRedirectDocs()];

  const url = env.VITE_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;

  if (url && key) {
    checks.push(await checkSupabaseHealth(url, key));
    checks.push(await checkAuthProviders(url, key));
    checks.push(...(await checkOAuthAuthorizeUrls(url, key)));
    checks.push(...(await checkSchemaTables(url, key)));
  } else if (url) {
    checks.push({
      name: "Supabase auth health",
      ok: false,
      detail: "skipped — VITE_SUPABASE_ANON_KEY missing",
    });
  }

  console.log("\nAutoDSM Supabase OAuth verification\n");
  let failed = 0;
  for (const check of checks) {
    const icon = check.ok ? "✓" : "✗";
    console.log(`  ${icon} ${check.name}: ${check.detail}`);
    if (!check.ok) failed += 1;
  }

  console.log("\nOptional manual smoke (interactive IdP sign-in):");
  console.log("  • Web dev: bun run dev → /onboarding/welcome → GitHub/Google");
  console.log("  • Electron dev: bun run dev:desktop → modal OAuth");
  console.log("  • Packaged DMG: signed build → loopback 127.0.0.1:3773/auth/callback\n");

  if (failed > 0) {
    process.exit(1);
  }
}

await main();
