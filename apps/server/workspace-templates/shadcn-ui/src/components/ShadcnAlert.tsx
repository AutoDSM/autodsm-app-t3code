import type { JSX, ReactNode } from "react";

export type ShadcnAlertVariant = "default" | "destructive";

export interface ShadcnAlertProps {
  readonly title?: string;
  readonly description?: ReactNode;
  readonly variant?: ShadcnAlertVariant;
}

export function ShadcnAlert(props: ShadcnAlertProps): JSX.Element {
  const {
    title = "Heads up",
    description = "Save your work before refreshing.",
    variant = "default",
  } = props;
  const colors =
    variant === "destructive"
      ? "border-[var(--destructive,#ef4444)] text-[var(--destructive,#ef4444)]"
      : "border-[var(--border)] text-[var(--foreground)]";
  return (
    <div role="alert" className={`rounded-md border px-4 py-3 ${colors}`}>
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-sm opacity-80">{description}</p>
    </div>
  );
}

export const ShadcnAlertDestructive = (props: Omit<ShadcnAlertProps, "variant">): JSX.Element => (
  <ShadcnAlert
    {...props}
    variant="destructive"
    title={props.title ?? "Something went wrong"}
    description={props.description ?? "Your changes could not be saved."}
  />
);
