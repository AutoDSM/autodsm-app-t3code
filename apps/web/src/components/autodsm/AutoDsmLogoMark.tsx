import type { JSX } from "react";

/**
 * Brand mark approximating the AutoDSM cube logo from design (purple isometric mark).
 */
export function AutoDsmLogoMark(props: { readonly className?: string }): JSX.Element {
  const { className } = props;
  return (
    <svg
      aria-hidden
      className={className}
      fill="none"
      height={40}
      viewBox="0 0 36 40"
      width={36}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M18 2 34 11v18L18 38 2 29V11L18 2Z" fill="url(#autoDsmLogoGlow)" opacity={0.35} />
      <path d="M18 6 30 13v14L18 34 6 27V13L18 6Z" fill="#7C3AED" />
      <path d="m18 6 12 7v4L18 10 6 17v-4L18 6Z" fill="#A78BFA" />
      <path d="M6 17v10l12 7V24L6 17Z" fill="#6D28D9" />
      <path d="m30 17-12 7v10l12-7V17Z" fill="#5B21B6" />
      <defs>
        <radialGradient
          cx={0}
          cy={0}
          gradientTransform="translate(18 20) scale(20 22)"
          gradientUnits="userSpaceOnUse"
          id="autoDsmLogoGlow"
          r={1}
        >
          <stop stopColor="#A78BFA" />
          <stop offset={1} stopColor="#5B21B6" stopOpacity={0} />
        </radialGradient>
      </defs>
    </svg>
  );
}
