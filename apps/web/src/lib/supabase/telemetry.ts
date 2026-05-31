import { APP_VERSION } from "~/branding";

import { getSupabaseBrowserClient } from "./browserClient";
import { isSupabaseAuthConfigured } from "./config";

const FLUSH_INTERVAL_MS = 5_000;
const MAX_BATCH_SIZE = 20;
const MAX_BUFFER_SIZE = 100;

export type AutoDsmTelemetryEventName =
  | "autodsm.sign_in.completed"
  | "autodsm.onboarding.step"
  | "autodsm.workspace.create.completed"
  | "autodsm.workspace.create.failed"
  | "autodsm.publish.completed";

interface BufferedTelemetryEvent {
  readonly eventName: AutoDsmTelemetryEventName;
  readonly properties: Record<string, string | number | boolean | null>;
}

let buffer: BufferedTelemetryEvent[] = [];
let flushTimer: number | null = null;
let clientSessionId: string | null = null;

function resolveClientSessionId(): string {
  if (clientSessionId !== null) {
    return clientSessionId;
  }
  clientSessionId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `session-${Date.now()}`;
  return clientSessionId;
}

function resolvePlatform(): string {
  if (typeof navigator === "undefined") {
    return "unknown";
  }
  return navigator.platform || "unknown";
}

function startFlushTimer(): void {
  if (flushTimer !== null || typeof window === "undefined") {
    return;
  }
  flushTimer = window.setInterval(() => {
    void flushAutoDsmTelemetry();
  }, FLUSH_INTERVAL_MS);
}

/** Record a coarse telemetry event (no source artifacts). */
export function recordAutoDsmTelemetry(
  eventName: AutoDsmTelemetryEventName,
  properties: Record<string, string | number | boolean | null> = {},
): void {
  if (!isSupabaseAuthConfigured()) {
    return;
  }

  buffer = [...buffer, { eventName, properties }];
  if (buffer.length > MAX_BUFFER_SIZE) {
    buffer = buffer.slice(buffer.length - MAX_BUFFER_SIZE);
  }
  startFlushTimer();
  if (buffer.length >= MAX_BATCH_SIZE) {
    void flushAutoDsmTelemetry();
  }
}

/** Flush buffered telemetry events to Supabase. */
export async function flushAutoDsmTelemetry(): Promise<void> {
  if (!isSupabaseAuthConfigured() || buffer.length === 0) {
    return;
  }

  const client = getSupabaseBrowserClient();
  if (client === null) {
    return;
  }

  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) {
    return;
  }

  const batch = buffer.slice(0, MAX_BATCH_SIZE);
  buffer = buffer.slice(batch.length);

  const rows = batch.map((event) => ({
    user_id: userData.user.id,
    event_name: event.eventName,
    event_version: 1,
    properties: event.properties,
    client_session_id: resolveClientSessionId(),
    app_version: APP_VERSION,
    platform: resolvePlatform(),
  }));

  const { error } = await client.from("telemetry_events").insert(rows);
  if (error) {
    buffer = [...batch, ...buffer].slice(-MAX_BUFFER_SIZE);
    return;
  }

  if (buffer.length === 0 && flushTimer !== null) {
    window.clearInterval(flushTimer);
    flushTimer = null;
  }
}
