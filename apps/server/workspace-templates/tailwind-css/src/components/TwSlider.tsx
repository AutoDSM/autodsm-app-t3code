import type { JSX } from "react";
import * as Slider from "@radix-ui/react-slider";

export interface TwSliderProps {
  readonly defaultValue?: number;
}

const thumbClass =
  "block h-4 w-4 rounded-full border border-[var(--border)] bg-[var(--background)] shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ring)]";

export function TwSlider(props: TwSliderProps = {}): JSX.Element {
  const { defaultValue = 50 } = props;
  return (
    <Slider.Root
      defaultValue={[defaultValue]}
      max={100}
      step={1}
      className="relative flex h-5 w-64 touch-none select-none items-center"
    >
      <Slider.Track className="relative h-1.5 grow rounded-full bg-[var(--muted)]">
        <Slider.Range className="absolute h-full rounded-full bg-[var(--primary,#4f46e5)]" />
      </Slider.Track>
      <Slider.Thumb className={thumbClass} aria-label="Volume" />
    </Slider.Root>
  );
}

export function TwSliderRange(_props: TwSliderProps = {}): JSX.Element {
  return (
    <Slider.Root
      defaultValue={[20, 75]}
      max={100}
      step={1}
      className="relative flex h-5 w-64 touch-none select-none items-center"
    >
      <Slider.Track className="relative h-1.5 grow rounded-full bg-[var(--muted)]">
        <Slider.Range className="absolute h-full rounded-full bg-[var(--primary,#4f46e5)]" />
      </Slider.Track>
      <Slider.Thumb className={thumbClass} aria-label="Min" />
      <Slider.Thumb className={thumbClass} aria-label="Max" />
    </Slider.Root>
  );
}
