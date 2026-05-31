# Supabase — AutoDSM cloud plane

Project ref: `mujlucfkoqvghvdikkhw`  
Dashboard: https://supabase.com/dashboard/project/mujlucfkoqvghvdikkhw

This directory tracks the AutoDSM-specific schema applied to the hosted Supabase project.
Earlier migrations (`remote_schema`, `user_onboarding`) were applied directly in the dashboard
before this repo export.

## Dashboard configuration (Phase 1 OAuth)

Auth URL settings are synced from `supabase/config.toml` via `supabase config push` (linked
project `mujlucfkoqvghvdikkhw`). Re-run after changing redirect URLs in this repo.

### URL configuration

| Setting      | Value                                                                            |
| ------------ | -------------------------------------------------------------------------------- |
| **Site URL** | `http://127.0.0.1:3773` (packaged desktop) — update when a hosted web URL exists |

**Redirect URLs** (add all four):

- `http://localhost:5733/auth/callback` — dev web (`bun run dev`)
- `http://127.0.0.1:5733/auth/callback` — dev web loopback alias
- `http://127.0.0.1:53682/auth/callback` — desktop system-browser OAuth (`bun run dev:desktop` + packaged)
- `http://127.0.0.1:3773/auth/callback` — legacy packaged loopback (optional)

### Providers

Enable under **Authentication → Providers**:

| Provider   | Notes                                                                                                                          |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **GitHub** | Create a GitHub OAuth App; callback URL = Supabase auth callback (`https://mujlucfkoqvghvdikkhw.supabase.co/auth/v1/callback`) |
| **Google** | Google Cloud OAuth client; authorized redirect = same Supabase auth callback                                                   |

No email magic-link or password UI in v1 — product sign-in is GitHub + Google OAuth only.

## Apply migrations

```bash
supabase link --project-ref mujlucfkoqvghvdikkhw
supabase db push
```

If `supabase db push` fails with a CLI login-role permission error, apply pending migrations via the
Supabase Dashboard SQL editor or the Supabase MCP `apply_migration` tool instead.

Expected tables (RLS enabled): `profiles`, `telemetry_events`, `feedback_submissions`, `publish_stats`.

## Client env

Copy `apps/web/.env.example` → `apps/web/.env`:

- `VITE_SUPABASE_URL` — `https://mujlucfkoqvghvdikkhw.supabase.co`
- `VITE_SUPABASE_ANON_KEY` — publishable/anon key from **Project Settings → API**

## GitHub Actions secrets (release builds)

Set in the repo **Settings → Secrets and variables → Actions**:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Referenced by `.github/workflows/release.yml` for web/desktop release builds. Without these,
release builds fail the Supabase env guard in `apps/web/vite.config.ts`.

## Verification

```bash
bun scripts/verify-supabase-oauth.ts
```

Automated checks: local env, auth health, schema table reachability, redirect URL docs.  
Manual smoke matrix (record in `build-progress.md` Phase 1):

| Surface         | Steps                                                    | Expected                                           |
| --------------- | -------------------------------------------------------- | -------------------------------------------------- |
| Web dev         | `bun run dev` → `/onboarding/welcome` → GitHub or Google | Redirect → `/auth/callback` → `/onboarding/create` |
| Electron dev    | `bun run dev:desktop` → welcome → GitHub/Google          | Browser OAuth → loopback `:53682` → product shell  |
| Packaged DMG    | Signed build → welcome → both providers                  | Browser OAuth + `autodsm://auth/success` focus     |
| Beta gate       | Set `profiles.beta_status = 'pending'` in dashboard      | User lands on `/onboarding/beta`                   |
| Session persist | Complete onboarding, quit, relaunch                      | Supabase session restores via `useSupabaseAuth`    |

Browser / web dev opens OAuth in a **pop-up window** (main app stays on welcome). The pop-up
finishes at `/auth/callback`, posts the authorization result to the opener, and closes. PKCE
exchange + session persistence happen in the main window.

## Electron desktop OAuth

The packaged and dev desktop apps sign in through the **system default browser**, not an in-app
window. PKCE stays in the main Electron renderer; the main process captures the OAuth callback on
a dedicated loopback port and returns the authorization code via IPC.

1. Welcome calls `signInWithOAuth({ skipBrowserRedirect: true })` in the main renderer (PKCE
   verifier stays in the UI session).
2. Main process starts `http://127.0.0.1:53682/auth/callback` and opens the Supabase OAuth URL in
   the default browser (`desktopBridge.startSupabaseOAuth`).
3. After IdP sign-in, Supabase redirects to the loopback callback; the main process captures
   `?code=` and shows a success page that deep-links `autodsm://auth/success` to focus AutoDSM.
4. The welcome screen calls `exchangeCodeForSession(code)`, bootstraps the local T3 server session,
   and navigates into onboarding or the authenticated product shell.

Set `AUTODSM_OAUTH_SHELL=1` to use the legacy in-app auth shell for debugging only.

## Security — beta_status

Migration `20260526120000_profiles_beta_status_immutable.sql` prevents authenticated clients from
self-updating `profiles.beta_status`. OAuth auto-approve (`autodsm_default_beta_status`) and
`service_role` dashboard edits still work.
