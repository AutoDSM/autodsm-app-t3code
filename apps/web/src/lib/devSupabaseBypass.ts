import { isSupabaseAuthConfigured } from "~/lib/supabase/config";

import { isLocalDevLoopbackTarget } from "./devPairingBypass";

/** Whether onboarding may skip Supabase OAuth and use local fake auth. */
export function allowFakeOnboardingAuth(): boolean {
  if (isSupabaseAuthConfigured()) {
    return false;
  }
  return import.meta.env.DEV && isLocalDevLoopbackTarget();
}
