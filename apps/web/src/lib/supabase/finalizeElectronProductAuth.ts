import type { OAuthSignInNavigation } from "./completeOAuthSignIn";
import {
  fetchAutoDsmDesignSystemOnDisk,
  resolveOwnerSubjectFromSupabase,
} from "~/lib/autoDsmDesignSystemPresence";
import { isElectron } from "~/env";
import { retryDesktopProductAuthUntilAuthenticated } from "~/environments/primary";
import { useUiStateStore } from "~/uiStateStore";

export function resolveElectronProductAuthDestination(input: {
  readonly navigation: OAuthSignInNavigation;
  readonly onboardingCompleted: boolean;
  readonly hasDesignSystemOnDisk: boolean;
}): string {
  if (input.navigation.kind === "beta") {
    return "/onboarding/beta";
  }
  if (input.navigation.kind === "error") {
    return "/onboarding/welcome";
  }
  // Presence wins over the localStorage `completed` flag: if the signed-in
  // user already has an owner-matched workspace on disk, send them home and
  // let bootstrap open it. This is the fix for "stale localStorage but
  // workspace exists for owner".
  if (input.hasDesignSystemOnDisk) {
    return "/home";
  }
  if (input.onboardingCompleted) {
    return "/";
  }
  return "/onboarding/create";
}

/** After Supabase OAuth on desktop, bootstrap T3 server auth and hard-navigate into the product. */
export async function finalizeElectronProductAuthAfterOAuth(
  navigation: OAuthSignInNavigation,
): Promise<void> {
  if (!isElectron || navigation.kind === "error") {
    return;
  }

  if (navigation.kind === "create") {
    useUiStateStore.getState().patchAutodsmOnboarding({
      fakeAuthProvider: navigation.provider,
    });
  }

  await retryDesktopProductAuthUntilAuthenticated({ maxWaitMs: 60_000 });

  const onboarding = useUiStateStore.getState().autodsmOnboarding;
  const ownerSubject = await resolveOwnerSubjectFromSupabase();
  const { hasMatch: hasDesignSystemOnDisk } = await fetchAutoDsmDesignSystemOnDisk({
    ownerSubject,
  });
  const destination = resolveElectronProductAuthDestination({
    navigation,
    onboardingCompleted: onboarding.completed,
    hasDesignSystemOnDisk,
  });

  window.location.replace(destination);
}
