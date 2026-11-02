"use client";

import { useActionState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { idle } from "@/lib/action-state";
import { sendContactRequestAction } from "@/server/modules/messaging/actions";

/** S38: standardisierte Anfrage ohne Freitext oder Link (MSG01). */
export function ContactRequestForm({ targetId, disabled }: { targetId: string; disabled?: boolean }) {
  const [state, action] = useActionState(sendContactRequestAction, idle);
  const outcome = state.status === "success" ? (state.data?.outcome as string | undefined) : undefined;
  const conversationId = state.data?.conversationId as string | null | undefined;

  if (outcome) {
    return (
      <div className="flex flex-col gap-4">
        <FormMessage state={state} />
        <div className="flex flex-wrap gap-2">
          {outcome === "active" && conversationId ? (
            <ButtonLink href={`/community/gespraeche/${conversationId}`} variant="primary">
              Zum Gespräch
            </ButtonLink>
          ) : (
            <ButtonLink href="/community/kontakte" variant="primary">
              Zu meinen Kontakten
            </ButtonLink>
          )}
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="targetId" value={targetId} />
      <FormMessage state={state} />
      <div>
        <SubmitButton
          size="lg"
          pendingText="Wird gesendet …"
          disabled={disabled}
          icon={<Icon name="user-plus" className="size-5" />}
        >
          Anfrage senden
        </SubmitButton>
      </div>
    </form>
  );
}
