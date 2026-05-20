"use client";

import type { JSX } from "react";

import { formatRelativeTimeLabel } from "~/timestampFormat";
import { formatDateHeader, pickSystemStatusLabel, type RegistryStatus } from "./homeMetrics";

export interface HomeGreetingProps {
  readonly projectName: string | null;
  readonly registryStatus: RegistryStatus | null;
  readonly sidecarReady: boolean | null;
  readonly lastPublishedAt: string | null;
  readonly now: Date;
}

export function HomeGreeting({
  projectName,
  registryStatus,
  sidecarReady,
  lastPublishedAt,
  now,
}: HomeGreetingProps): JSX.Element {
  const dateLabel = formatDateHeader(now);
  const systemStatus = pickSystemStatusLabel({ registryStatus, sidecarReady });
  const name = projectName && projectName.trim().length > 0 ? projectName : "your design system";

  const statusSuffix =
    lastPublishedAt !== null ? ` · last published ${formatRelativeTimeLabel(lastPublishedAt)}` : "";

  return (
    <header className="flex flex-col gap-2">
      <p className="text-muted-foreground text-sm">{dateLabel}</p>
      <h1 className="text-4xl font-semibold tracking-tight text-foreground">
        Let&rsquo;s build <span className="text-foreground">{name}</span>.
      </h1>
      <p className="text-muted-foreground text-sm">
        {systemStatus}
        {statusSuffix}
      </p>
    </header>
  );
}
