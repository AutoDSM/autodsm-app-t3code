import { APP_VERSION } from "~/branding";

import { getSupabaseBrowserClient } from "./browserClient";
import { isSupabaseAuthConfigured } from "./config";

export interface SubmitAutoDsmFeedbackInput {
  readonly message: string;
  readonly category?: string;
  readonly rating?: number;
}

export async function submitAutoDsmFeedback(input: SubmitAutoDsmFeedbackInput): Promise<void> {
  if (!isSupabaseAuthConfigured()) {
    throw new Error("Feedback is unavailable because Supabase is not configured.");
  }

  const client = getSupabaseBrowserClient();
  if (client === null) {
    throw new Error("Feedback is unavailable because Supabase is not configured.");
  }

  const trimmedMessage = input.message.trim();
  if (trimmedMessage.length === 0) {
    throw new Error("Feedback message is required.");
  }

  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) {
    throw new Error("Sign in to submit feedback.");
  }

  const { error } = await client.from("feedback_submissions").insert({
    user_id: userData.user.id,
    category: input.category?.trim() || "general",
    message: trimmedMessage,
    ...(input.rating !== undefined ? { rating: input.rating } : {}),
    app_version: APP_VERSION,
    platform: typeof navigator !== "undefined" ? navigator.platform || "unknown" : "unknown",
  });

  if (error) {
    throw error;
  }
}
