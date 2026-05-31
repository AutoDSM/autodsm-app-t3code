import { useEffect, useState } from "react";
import type { JSX } from "react";
import useEmblaCarousel from "embla-carousel-react";

export interface ShadcnCarouselProps {
  readonly slides?: readonly string[];
}

export function ShadcnCarousel(props: ShadcnCarouselProps): JSX.Element {
  const slides = props.slides ?? ["Slide 1", "Slide 2", "Slide 3", "Slide 4", "Slide 5"];
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelected(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    onSelect();
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  return (
    <div className="relative">
      <div className="overflow-hidden rounded-md" ref={emblaRef}>
        <div className="flex">
          {slides.map((label, i) => (
            <div
              key={`${label}-${i}`}
              className="relative flex min-w-0 shrink-0 grow-0 basis-full items-center justify-center bg-[var(--muted)] p-12 text-2xl font-semibold text-[var(--foreground)]"
            >
              {label}
            </div>
          ))}
        </div>
      </div>
      <button
        type="button"
        onClick={() => emblaApi?.scrollPrev()}
        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full border border-[var(--border)] bg-[var(--background)] p-2 text-[var(--foreground)] shadow"
        aria-label="Previous slide"
      >
        ‹
      </button>
      <button
        type="button"
        onClick={() => emblaApi?.scrollNext()}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-[var(--border)] bg-[var(--background)] p-2 text-[var(--foreground)] shadow"
        aria-label="Next slide"
      >
        ›
      </button>
      <div className="mt-2 flex justify-center gap-1">
        {slides.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 w-1.5 rounded-full ${
              i === selected ? "bg-[var(--primary)]" : "bg-[var(--muted)]"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
