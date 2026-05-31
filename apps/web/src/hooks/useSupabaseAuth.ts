import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

import {
  fetchCurrentSupabaseProfile,
  isSupabaseAuthEnabled,
  type AutoDsmOAuthProvider,
} from "~/lib/supabase/auth";
import { getSupabaseBrowserClient } from "~/lib/supabase/browserClient";
import { rememberOAuthAccountHint } from "~/lib/supabase/oauthAccountHints";
import type { AutoDsmSupabaseProfile } from "~/lib/supabase/profile";

export interface SupabaseAuthState {
  readonly enabled: boolean;
  readonly loading: boolean;
  readonly session: Session | null;
  readonly profile: AutoDsmSupabaseProfile | null;
  readonly provider: AutoDsmOAuthProvider | null;
  readonly betaApproved: boolean;
}

const INITIAL: SupabaseAuthState = {
  enabled: isSupabaseAuthEnabled(),
  loading: isSupabaseAuthEnabled(),
  session: null,
  profile: null,
  provider: null,
  betaApproved: false,
};

function rememberProfileOAuthHint(profile: AutoDsmSupabaseProfile | null): void {
  if (profile?.provider === "google" || profile?.provider === "github") {
    rememberOAuthAccountHint(profile.provider, profile.email);
  }
}

export function useSupabaseAuth(): SupabaseAuthState {
  const [state, setState] = useState<SupabaseAuthState>(INITIAL);

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    if (client === null) {
      setState({
        enabled: false,
        loading: false,
        session: null,
        profile: null,
        provider: null,
        betaApproved: false,
      });
      return;
    }

    let cancelled = false;

    const sync = async (session: Session | null): Promise<void> => {
      if (!session) {
        if (!cancelled) {
          setState({
            enabled: true,
            loading: false,
            session: null,
            profile: null,
            provider: null,
            betaApproved: false,
          });
        }
        return;
      }
      try {
        const profile = await fetchCurrentSupabaseProfile();
        if (cancelled) {
          return;
        }
        rememberProfileOAuthHint(profile);
        setState({
          enabled: true,
          loading: false,
          session,
          profile,
          provider: profile?.provider ?? null,
          betaApproved: profile?.betaStatus === "approved",
        });
      } catch {
        if (!cancelled) {
          setState({
            enabled: true,
            loading: false,
            session,
            profile: null,
            provider: null,
            betaApproved: false,
          });
        }
      }
    };

    void client.auth.getSession().then(({ data }) => {
      void sync(data.session);
    });

    const { data: subscription } = client.auth.onAuthStateChange((_event, session) => {
      setState((prev) => ({ ...prev, loading: true }));
      void sync(session);
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  return state;
}
