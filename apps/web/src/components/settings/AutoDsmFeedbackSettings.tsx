import { useState, type JSX } from "react";

import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { isSupabaseAuthConfigured } from "~/lib/supabase/config";
import { submitAutoDsmFeedback } from "~/lib/supabase/feedback";
import { stackedThreadToast, toastManager } from "~/components/ui/toast";

import { SettingsRow, SettingsSection } from "./settingsLayout";

export function AutoDsmFeedbackSettings(): JSX.Element | null {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  if (!isSupabaseAuthConfigured()) {
    return null;
  }

  return (
    <SettingsSection title="AutoDSM feedback">
      <SettingsRow
        title="Send feedback"
        description="Share product feedback with the AutoDSM team. No source code or tokens are included."
        control={
          <div className="flex w-full max-w-md flex-col gap-2">
            <Textarea
              aria-label="AutoDSM feedback message"
              className="min-h-24 resize-y"
              disabled={pending}
              onChange={(event) => {
                setMessage(event.target.value);
              }}
              placeholder="What worked well? What should we improve?"
              value={message}
            />
            <Button
              className="self-end"
              disabled={pending || message.trim().length === 0}
              onClick={() => {
                setPending(true);
                void submitAutoDsmFeedback({ message })
                  .then(() => {
                    setMessage("");
                    toastManager.add(
                      stackedThreadToast({
                        type: "success",
                        title: "Feedback sent",
                        description: "Thanks — your note was submitted.",
                      }),
                    );
                  })
                  .catch((cause: unknown) => {
                    toastManager.add(
                      stackedThreadToast({
                        type: "error",
                        title: "Could not send feedback",
                        description:
                          cause instanceof Error ? cause.message : "Try again in a moment.",
                      }),
                    );
                  })
                  .finally(() => {
                    setPending(false);
                  });
              }}
              size="sm"
              type="button"
            >
              {pending ? "Sending…" : "Submit feedback"}
            </Button>
          </div>
        }
      />
    </SettingsSection>
  );
}
