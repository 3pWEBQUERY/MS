"use client";

import { useActionState } from "react";
import { CountedTextarea, FormMessage, SubmitButton } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { idle } from "@/lib/action-state";
import { createCommentAction } from "@/server/modules/community/actions";

/** Antwort schreiben (COM02): eine Ebene tief, höchstens 2 000 Zeichen, Text ohne HTML. */
export function ReplyForm({ postId, maxLength }: { postId: string; maxLength: number }) {
  const [state, action] = useActionState(createCommentAction, idle);
  // Nach bestätigtem Erfolg wird das Feld durch einen neuen Schlüssel geleert.
  const resetKey = state.status === "success" ? String(state.data?.commentId ?? "ok") : "draft";
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="postId" value={postId} />
      <CountedTextarea
        key={resetKey}
        label="Deine Antwort"
        name="body"
        maxLength={maxLength}
        rows={4}
        required
        hint="Teile deine eigene Erfahrung. Bitte keine Gesundheitsunterlagen oder Daten anderer Personen."
        defaultValue={state.status === "error" ? ((state.values?.body as string) ?? "") : ""}
        error={state.fieldErrors?.body}
      />
      <FormMessage state={state} />
      <div>
        <SubmitButton pendingText="Wird veröffentlicht …" icon={<Icon name="send" className="size-5" />}>
          Antwort veröffentlichen
        </SubmitButton>
      </div>
    </form>
  );
}
