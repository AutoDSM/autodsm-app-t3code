import { useRef, useState } from "react";
import type { JSX, KeyboardEvent, ClipboardEvent } from "react";

export interface ShadcnInputOtpProps {
  readonly length?: number;
}

export function ShadcnInputOtp(props: ShadcnInputOtpProps): JSX.Element {
  const length = props.length ?? 6;
  const [values, setValues] = useState<string[]>(() => Array.from({ length }, () => ""));
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  const setAt = (i: number, v: string) => {
    setValues((prev) => {
      const next = [...prev];
      next[i] = v;
      return next;
    });
  };

  const handleChange = (i: number, raw: string) => {
    const ch = raw.replace(/\D/g, "").slice(0, 1);
    setAt(i, ch);
    if (ch && i < length - 1) refs.current[i + 1]?.focus();
  };

  const handleKey = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !values[i] && i > 0) {
      refs.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!text) return;
    e.preventDefault();
    const next = Array.from({ length }, (_, i) => text[i] ?? "");
    setValues(next);
    const focusIndex = Math.min(text.length, length - 1);
    refs.current[focusIndex]?.focus();
  };

  return (
    <div className="flex gap-2" onPaste={handlePaste}>
      {values.map((value, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKey(i, e)}
          aria-label={`Digit ${i + 1}`}
          className="h-10 w-10 rounded-md border border-[var(--border)] bg-[var(--background)] text-center text-base text-[var(--foreground)] outline-none focus:ring-2 focus:ring-[var(--ring,var(--primary))]"
        />
      ))}
    </div>
  );
}

export const ShadcnInputOtp4Digit = (props: Omit<ShadcnInputOtpProps, "length">): JSX.Element => (
  <ShadcnInputOtp {...props} length={4} />
);

export const ShadcnInputOtp6Digit = (props: Omit<ShadcnInputOtpProps, "length">): JSX.Element => (
  <ShadcnInputOtp {...props} length={6} />
);
