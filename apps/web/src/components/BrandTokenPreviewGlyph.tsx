import type { AutoDsmBrandToken, AutoDsmBrandTokenCategory } from "@t3tools/contracts";
import type { ReactElement } from "react";

import { cn } from "~/lib/utils";

type BrandTokenPreviewInput = Pick<AutoDsmBrandToken, "category" | "color" | "value">;

const GLYPH_SIZE_CLASS = {
  sm: "size-3 text-[9px]",
  md: "size-4 text-[10px]",
} as const;

export function BrandTokenPreviewGlyph(props: {
  readonly token: BrandTokenPreviewInput;
  readonly size?: keyof typeof GLYPH_SIZE_CLASS;
  readonly className?: string;
}): ReactElement {
  const size = props.size ?? "sm";
  const sizeClass = GLYPH_SIZE_CLASS[size];

  if (props.token.category === "color") {
    return (
      <span
        aria-hidden
        className={cn(
          "inline-block shrink-0 rounded-full border border-brand/45",
          sizeClass,
          props.className,
        )}
        style={{ backgroundColor: props.token.color?.light ?? props.token.value }}
      />
    );
  }

  if (props.token.category === "typography") {
    return (
      <span
        aria-hidden
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded border border-brand/45 font-semibold leading-none text-brand",
          sizeClass,
          props.className,
        )}
      >
        T
      </span>
    );
  }

  if (props.token.category === "radius") {
    return (
      <span
        aria-hidden
        className={cn(
          "inline-block shrink-0 border border-brand/45 bg-brand/10",
          sizeClass,
          props.className,
        )}
        style={{ borderRadius: props.token.value || "0.25rem" }}
      />
    );
  }

  if (props.token.category === "shadow") {
    return (
      <span
        aria-hidden
        className={cn(
          "inline-block shrink-0 rounded-sm border border-brand/30 bg-background",
          sizeClass,
          props.className,
        )}
        style={{ boxShadow: props.token.value || "0 1px 2px rgb(0 0 0 / 0.1)" }}
      />
    );
  }

  if (props.token.category === "icon") {
    return (
      <span
        aria-hidden
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded border border-brand/45 text-brand",
          sizeClass,
          props.className,
        )}
      >
        <svg viewBox="0 0 16 16" className="size-[70%]" fill="currentColor" aria-hidden>
          <path d="M2 2h4v4H2V2zm8 0h4v4h-4V2zM2 10h4v4H2v-4zm8 0h4v4h-4v-4z" />
        </svg>
      </span>
    );
  }

  return (
    <span
      aria-hidden
      className={cn(
        "inline-block shrink-0 rounded-full border border-brand/45",
        sizeClass,
        props.className,
      )}
    />
  );
}

export function brandTokenPreviewFromCategory(
  category: AutoDsmBrandTokenCategory | undefined,
  swatch?: string | undefined,
): BrandTokenPreviewInput {
  if (category === "color") {
    return {
      category: "color",
      value: swatch ?? "",
      color: swatch ? { light: swatch } : undefined,
    };
  }
  if (category === "typography") {
    return { category: "typography", value: "" };
  }
  if (category === "radius") {
    return { category: "radius", value: "0.375rem" };
  }
  if (category === "shadow") {
    return { category: "shadow", value: "0 1px 2px rgb(0 0 0 / 0.1)" };
  }
  if (category === "icon") {
    return { category: "icon", value: "lucide" };
  }
  return { category: category ?? "spacing", value: "" };
}
