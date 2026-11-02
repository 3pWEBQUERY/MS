"use client";

import { useActionState } from "react";
import { CountedTextarea, Field, FormMessage, Input, Select, SubmitButton, UnsavedChangesGuard } from "@/components/ui/form";
import { idle } from "@/lib/action-state";
import { updatePostAction } from "@/server/modules/community/actions";

/** S32: Text, Titel und Thema ändern; jede Änderung wird als bearbeitet markiert (COM03). */
export function EditPostForm({
  post,
  topics,
  maxBody,
  maxTitle,
}: {
  post: { id: string; version: number; title: string; body: string; topic: string };
  topics: { value: string; label: string }[];
  maxBody: number;
  maxTitle: number;
}) {
  const [state, action] = useActionState(updatePostAction, idle);
  const v = (state.values ?? {}) as Record<string, string | undefined>;
  return (
    <form id="edit-post" action={action} className="flex flex-col gap-6" noValidate>
      <UnsavedChangesGuard formId="edit-post" />
      <input type="hidden" name="postId" value={post.id} />
      <input type="hidden" name="version" value={post.version} />
      <FormMessage state={state} />
      <Field label="Thema" required error={state.fieldErrors?.topic}>
        {(p) => (
          <Select {...p} name="topic" defaultValue={v.topic ?? post.topic}>
            {topics.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="Titel" optional error={state.fieldErrors?.title}>
        {(p) => <Input {...p} name="title" maxLength={maxTitle} defaultValue={v.title ?? post.title} autoComplete="off" />}
      </Field>
      <CountedTextarea
        label="Dein Text"
        name="body"
        maxLength={maxBody}
        rows={10}
        required
        hint="Nach dem Speichern erscheint der Hinweis «bearbeitet»."
        defaultValue={v.body ?? post.body}
        error={state.fieldErrors?.body}
      />
      <div>
        <SubmitButton pendingText="Wird gespeichert …">Änderung speichern</SubmitButton>
      </div>
    </form>
  );
}
