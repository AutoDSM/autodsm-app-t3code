import { Avatar } from "@chakra-ui/react";
import type { JSX } from "react";

import { ChakraPreviewShell } from "../preview/ChakraPreviewShell";

export interface ChakraAvatarProps {
  readonly name?: string;
  readonly size?: "xs" | "sm" | "md" | "lg" | "xl";
}

export function ChakraAvatar(props: ChakraAvatarProps): JSX.Element {
  const { name = "Autodsm User", size = "md" } = props;
  return (
    <ChakraPreviewShell>
      <Avatar name={name} size={size} />
    </ChakraPreviewShell>
  );
}

export interface ChakraAvatarVariantProps {
  readonly name?: string;
}

export function ChakraAvatarXs(props: ChakraAvatarVariantProps): JSX.Element {
  const { name = "Autodsm User" } = props;
  return (
    <ChakraPreviewShell>
      <Avatar name={name} size="xs" />
    </ChakraPreviewShell>
  );
}

export function ChakraAvatarSm(props: ChakraAvatarVariantProps): JSX.Element {
  const { name = "Autodsm User" } = props;
  return (
    <ChakraPreviewShell>
      <Avatar name={name} size="sm" />
    </ChakraPreviewShell>
  );
}

export function ChakraAvatarMd(props: ChakraAvatarVariantProps): JSX.Element {
  const { name = "Autodsm User" } = props;
  return (
    <ChakraPreviewShell>
      <Avatar name={name} size="md" />
    </ChakraPreviewShell>
  );
}

export function ChakraAvatarLg(props: ChakraAvatarVariantProps): JSX.Element {
  const { name = "Autodsm User" } = props;
  return (
    <ChakraPreviewShell>
      <Avatar name={name} size="lg" />
    </ChakraPreviewShell>
  );
}

export function ChakraAvatarXl(props: ChakraAvatarVariantProps): JSX.Element {
  const { name = "Autodsm User" } = props;
  return (
    <ChakraPreviewShell>
      <Avatar name={name} size="xl" />
    </ChakraPreviewShell>
  );
}
