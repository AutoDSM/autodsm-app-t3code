import type { JSX } from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";

export interface TwAvatarProps {
  readonly src?: string;
  readonly alt?: string;
  readonly fallback?: string;
}

export function TwAvatar(props: TwAvatarProps = {}): JSX.Element {
  const {
    src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=64&h=64&fit=crop&crop=face",
    alt = "Casey Rivera",
    fallback = "CR",
  } = props;
  return (
    <AvatarPrimitive.Root className="inline-flex h-10 w-10 select-none items-center justify-center overflow-hidden rounded-full bg-[var(--muted)] align-middle">
      <AvatarPrimitive.Image src={src} alt={alt} className="h-full w-full object-cover" />
      <AvatarPrimitive.Fallback className="text-sm font-medium text-[var(--foreground)]">
        {fallback}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}

export function TwAvatarFallback(props: TwAvatarProps = {}): JSX.Element {
  const { fallback = "AD" } = props;
  return (
    <AvatarPrimitive.Root className="inline-flex h-10 w-10 select-none items-center justify-center overflow-hidden rounded-full bg-[var(--muted)] align-middle">
      <AvatarPrimitive.Fallback
        delayMs={0}
        className="text-sm font-medium text-[var(--foreground)]"
      >
        {fallback}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}

export function TwAvatarLg(props: TwAvatarProps = {}): JSX.Element {
  const {
    src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=128&h=128&fit=crop&crop=face",
    alt = "Casey Rivera",
    fallback = "CR",
  } = props;
  return (
    <AvatarPrimitive.Root className="inline-flex h-16 w-16 select-none items-center justify-center overflow-hidden rounded-full bg-[var(--muted)] align-middle">
      <AvatarPrimitive.Image src={src} alt={alt} className="h-full w-full object-cover" />
      <AvatarPrimitive.Fallback className="text-base font-medium text-[var(--foreground)]">
        {fallback}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}
