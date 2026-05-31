import { useCallback, type JSX } from "react";
import useEmblaCarousel from "embla-carousel-react";

export interface TwCarouselProps {
  readonly slides?: ReadonlyArray<string>;
}

export function TwCarousel(props: TwCarouselProps = {}): JSX.Element {
  const { slides = ["Slide 1", "Slide 2", "Slide 3", "Slide 4"] } = props;
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  return (
    <div className="relative w-full max-w-md">
      <div className="overflow-hidden rounded-lg border border-[var(--border)]" ref={emblaRef}>
        <div className="flex">
          {slides.map((slide, idx) => (
            <div
              key={`${slide}-${idx}`}
              className="flex min-w-0 flex-[0_0_100%] items-center justify-center bg-[var(--muted)] py-16 text-base font-semibold text-[var(--foreground)]"
            >
              {slide}
            </div>
          ))}
        </div>
      </div>
      <button
        type="button"
        onClick={scrollPrev}
        aria-label="Previous slide"
        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-sm shadow"
      >
        ‹
      </button>
      <button
        type="button"
        onClick={scrollNext}
        aria-label="Next slide"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-sm shadow"
      >
        ›
      </button>
    </div>
  );
}
