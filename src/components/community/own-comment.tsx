"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { CountedTextarea, FormMessage, SubmitButton } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { PlainText } from "@/components/ui/primitives";
import { idle, type ActionState } from "@/lib/action-state";
import { deleteCommentAction, updateCommentAction } from "@/server/modules/community/actions";
import { ConfirmForm } from "./confirm-form";

/** Eigene Antwort: bearbeiten (wird als bearbeitet markiert) oder löschen mit Bestätigung (COM03). */
export function OwnComment({
  comment,
  maxLength,
  canEdit,
}: {
  comment: { id: string; body: string; version: number };
  maxLength: number;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [state, action] = useActionState(async (prev: ActionState, fd: FormData) => {
    const result = await updateCommentAction(prev, fd);
    if (result.status === "success") setEditing(false);
    return result;
  }, idle);

  if (editing) {
    return (
      <form action={action} className="flex flex-col gap-4" noValidate>
        <input type="hidden" name="commentId" value={comment.id} />
        <input type="hidden" name="version" value={comment.version} />
        <CountedTextarea
          label="Antwort bearbeiten"
          name="body"
          maxLength={maxLength}
          rows={4}
          required
          hint="Nach dem Speichern wird die Antwort als «bearbeitet» gekennzeichnet."
          defaultValue={state.status === "error" ? ((state.values?.body as string) ?? comment.body) : comment.body}
          error={state.fieldErrors?.body}
        />
        <FormMessage state={state} />
        <div className="flex flex-wrap gap-2">
          <SubmitButton size="sm" pendingText="Wird gespeichert …">
            Änderung speichern
          </SubmitButton>
          <Button variant="secondary" size="sm" onClick={() => setEditing(false)}>
            Abbrechen
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <PlainText text={comment.body} className="text-base text-ink" />
      {state.status === "success" && <FormMessage state={state} />}
      <div className="flex flex-wrap items-start gap-2">
        {canEdit && (
          <Button variant="secondary" size="sm" onClick={() => setEditing(true)} icon={<Icon name="pencil" className="size-4" />}>
            Bearbeiten
          </Button>
        )}
        <ConfirmForm
          action={deleteCommentAction}
          hidden={{ commentId: comment.id }}
          triggerLabel="Löschen"
          title="Antwort löschen?"
          description="Der Text deiner Antwort wird sofort entfernt und kann nicht wiederhergestellt werden."
          confirmLabel="Antwort löschen"
          pendingText="Wird gelöscht …"
        />
      </div>
    </div>
  );
}
