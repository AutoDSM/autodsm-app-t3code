import type { AutoDsmFakeAuthProvider } from "~/lib/autoDsmOnboarding";

import { getSupabaseBrowserClient } from "./browserClient";

export type AutoDsmBetaStatus = "pending" | "approved" | "rejected";

export interface AutoDsmSupabaseProfile {
  readonly id: string;
  readonly email: string | null;
  readonly displayName: string | null;
  readonly avatarUrl: string | null;
  readonly provider: AutoDsmFakeAuthProvider | null;
  readonly betaStatus: AutoDsmBetaStatus;
}

function normalizeOAuthProvider(raw: string | null | undefined): AutoDsmFakeAuthProvider | null {
  const value = raw?.trim().toLowerCase() ?? "";
  if (value === "github") {
    return "github";
  }
  if (value === "google") {
    return "google";
  }
  return null;
}

function normalizeBetaStatus(raw: string | null | undefined): AutoDsmBetaStatus {
  if (raw === "pending" || raw === "rejected") {
    return raw;
  }
  return "approved";
}

export function mapSupabaseProfileRow(row: {
  readonly id: string;
  readonly email?: string | null;
  readonly display_name?: string | null;
  readonly avatar_url?: string | null;
  readonly provider?: string | null;
  readonly beta_status?: string | null;
}): AutoDsmSupabaseProfile {
  return {
    id: row.id,
    email: row.email ?? null,
    displayName: row.display_name ?? null,
    avatarUrl: row.avatar_url ?? null,
    provider: normalizeOAuthProvider(row.provider),
    betaStatus: normalizeBetaStatus(row.beta_status),
  };
}

export async function fetchCurrentSupabaseProfile(): Promise<AutoDsmSupabaseProfile | null> {
  const client = getSupabaseBrowserClient();
  if (client === null) {
    return null;
  }
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) {
    return null;
  }
  const { data, error } = await client
    .from("profiles")
    .select("id, email, display_name, avatar_url, provider, beta_status")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (error) {
    throw error;
  }
  const inferredProvider =
    (userData.user.app_metadata?.provider as string | undefined) ??
    userData.user.identities?.[0]?.provider ??
    null;

  if (!data) {
    return mapSupabaseProfileRow({
      id: userData.user.id,
      email: userData.user.email ?? null,
      display_name:
        (userData.user.user_metadata?.full_name as string | undefined) ??
        (userData.user.user_metadata?.name as string | undefined) ??
        null,
      avatar_url:
        (userData.user.user_metadata?.avatar_url as string | undefined) ??
        (userData.user.user_metadata?.picture as string | undefined) ??
        null,
      provider: inferredProvider,
      beta_status: "approved",
    });
  }

  const mapped = mapSupabaseProfileRow(data);
  if (mapped.provider) {
    return mapped;
  }

  const provider = normalizeOAuthProvider(inferredProvider);
  return provider ? { ...mapped, provider } : mapped;
}
