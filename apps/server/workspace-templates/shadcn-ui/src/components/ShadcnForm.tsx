import { useState } from "react";
import type { JSX } from "react";

export interface ShadcnFormProps {
  readonly submitLabel?: string;
}

export function ShadcnForm(props: ShadcnFormProps): JSX.Element {
  const { submitLabel = "Sign in" } = props;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setSubmitted(true);
      }}
      className="w-full max-w-sm space-y-4"
    >
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="shadcn-form-email"
          className="text-sm font-medium leading-none text-[var(--foreground)]"
        >
          Email
        </label>
        <input
          id="shadcn-form-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:ring-2 focus:ring-[var(--ring,var(--primary))]"
        />
        <p className="text-xs text-[var(--foreground)] opacity-60">
          We&apos;ll never share your email.
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="shadcn-form-password"
          className="text-sm font-medium leading-none text-[var(--foreground)]"
        >
          Password
        </label>
        <input
          id="shadcn-form-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:ring-2 focus:ring-[var(--ring,var(--primary))]"
        />
      </div>
      <button
        type="submit"
        className="w-full rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] hover:opacity-90"
      >
        {submitLabel}
      </button>
      {submitted ? (
        <p className="text-sm text-[var(--foreground)] opacity-70">
          Submitted as {email || "(no email)"}.
        </p>
      ) : null}
    </form>
  );
}
