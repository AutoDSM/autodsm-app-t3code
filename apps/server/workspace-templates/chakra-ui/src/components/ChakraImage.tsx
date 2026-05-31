import { Image } from "@chakra-ui/react";
import type { JSX } from "react";

import { ChakraPreviewShell } from "../preview/ChakraPreviewShell";

const DEFAULT_SRC = "https://placehold.co/240x160/805ad5/ffffff?text=Chakra";

export interface ChakraImageProps {
  readonly src?: string;
  readonly alt?: string;
}

export function ChakraImage(props: ChakraImageProps): JSX.Element {
  const { src = DEFAULT_SRC, alt = "Sample" } = props;
  return (
    <ChakraPreviewShell>
      <Image src={src} alt={alt} boxSize="160px" objectFit="cover" />
    </ChakraPreviewShell>
  );
}

export interface ChakraImageVariantProps {
  readonly src?: string;
  readonly alt?: string;
}

export function ChakraImageRounded(props: ChakraImageVariantProps): JSX.Element {
  const { src = DEFAULT_SRC, alt = "Sample" } = props;
  return (
    <ChakraPreviewShell>
      <Image src={src} alt={alt} boxSize="120px" borderRadius="full" objectFit="cover" />
    </ChakraPreviewShell>
  );
}

export function ChakraImageThumb(props: ChakraImageVariantProps): JSX.Element {
  const { src = DEFAULT_SRC, alt = "Sample" } = props;
  return (
    <ChakraPreviewShell>
      <Image
        src={src}
        alt={alt}
        boxSize="64px"
        borderRadius="md"
        borderWidth="1px"
        borderColor="gray.200"
        objectFit="cover"
      />
    </ChakraPreviewShell>
  );
}
