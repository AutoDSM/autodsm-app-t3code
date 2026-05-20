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
          "inline-block shrink-0 rounded-full border border-[#8a38f5]/45",
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
          "inline-flex shrink-0 items-center justify-center rounded border border-[#8a38f5]/45 font-semibold leading-none text-[#8a38f5] dark:text-[#c084fc]",
          sizeClass,
          props.className,
        )}
      >
        T
      </span>
    );
  }

  return (
    <span
      aria-hidden
      className={cn(
        "inline-block shrink-0 rounded-full border border-[#8a38f5]/45",
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
  return { category: category ?? "spacing", value: "" };
}
