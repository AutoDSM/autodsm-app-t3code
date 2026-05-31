import { useState, type JSX } from "react";

export interface TwInputOtpProps {
  readonly length?: number;
}

function OtpField({ length }: { length: number }): JSX.Element {
  const [values, setValues] = useState<string[]>(() => Array.from({ length }, () => ""));

  return (
    <div className="inline-flex gap-2">
      {values.map((value, idx) => (
        <input
          key={idx}
          inputMode="numeric"
          maxLength={1}
          value={value}
          onChange={(e) => {
            const next = [...values];
            next[idx] = e.target.value.slice(-1);
            setValues(next);
          }}
          className="h-10 w-10 rounded-md border border-[var(--border)] bg-[var(--background)] text-center text-base font-medium text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ring)]"
        />
      ))}
    </div>
  );
}

export function TwInputOtp(props: TwInputOtpProps = {}): JSX.Element {
  const { length = 6 } = props;
  return <OtpField length={length} />;
}

export function TwInputOtp4Digit(_props: TwInputOtpProps = {}): JSX.Element {
  return <OtpField length={4} />;
}

export function TwInputOtp6Digit(_props: TwInputOtpProps = {}): JSX.Element {
  return <OtpField length={6} />;
}
