import type { JSX } from "react";

import logoDark from "~/assets/autodsm/logo-dark.png";
import logoDefault from "~/assets/autodsm/logo-default.png";
import { cn } from "~/lib/utils";

/**
 * AutoDSM horizontal logo (icon + wordmark). Switches between light- and dark-theme assets.
 */
export function AutoDsmLogoMark(props: { readonly className?: string }): JSX.Element {
  const { className } = props;

  return (
    <>
      <img
        alt="AutoDSM"
        className={cn("h-10 w-auto object-contain object-left dark:hidden", className)}
        src={logoDefault}
      />
      <img
        alt="AutoDSM"
        className={cn("hidden h-10 w-auto object-contain object-left dark:block", className)}
        src={logoDark}
      />
    </>
  );
}
