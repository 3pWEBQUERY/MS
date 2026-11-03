"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  CountedTextarea,
  Field,
  FormMessage,
  Input,
  RadioCards,
  Select,
  SubmitButton,
  UnsavedChangesGuard,
} from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { Notice, PlainText } from "@/components/ui/primitives";
import { idle } from "@/lib/action-state";
import { createPostAction } from "@/server/modules/community/actions";

export type TargetOption = { value: string; label: string; description: string; disabled?: boolean };

/**
 * S30: Bearbeiten → Vorschau (serverseitig bereinigt) → Veröffentlichen.
 * Der Text wird nur als Text angezeigt; HTML und Anhänge sind unmöglich (COM02).
 */
export function PostForm({
  topics,
  targets,
  defaults,
  maxBody,
  maxTitle,
}: {
  topics: { value: string; label: string }[];
  targets: TargetOption[];
  defaults: { topic?: string; target?: string };
  maxBody: number;
  maxTitle: number;
}) {
  const [state, action] = useActionState(createPostAction, idle);
  const v = (state.values ?? {}) as Record<string, string | undefined>;
  const step = state.data?.step === "preview" ? "preview" : "edit";

  if (step === "preview") {
    const topicLabel = topics.find((t) => t.value === v.topic)?.label ?? "";
    const target = targets.find((t) => t.value === v.target);
    return (
      <form action={action} className="flex flex-col gap-6">
        <input type="hidden" name="topic" value={v.topic ?? ""} />
        <input type="hidden" name="title" value={v.title ?? ""} />
        <input type="hidden" name="body" value={v.body ?? ""} />
        <input type="hidden" name="target" value={v.target ?? ""} />

        <section aria-labelledby="preview-title" className="flex flex-col gap-4">
          <div className="flex flex-col gap-1" role="status">
            <h2 id="preview-title" className="display-sm">
              Vorschau
            </h2>
            <p className="text-base text-ink-2">So sehen andere deinen Beitrag. Er ist noch nicht veröffentlicht.</p>
          </div>
          {/* Vorschau im Satz des Strangs: Rubrik in Mono, Titel in der Display-Serif */}
          <div className="flex flex-col gap-3 rounded-[20px] border border-line bg-surface p-5 sm:p-6">
            <p className="font-display text-[0.8125rem] font-semibold uppercase tracking-[0.12em] text-accent-ink">{topicLabel}</p>
            {v.title && (
              <p className="break-words font-display text-[1.5rem] leading-[1.15] tracking-[-0.015em] text-ink sm:text-[1.75rem]">{v.title}</p>
            )}
            <PlainText text={v.body ?? ""} className="max-w-[68ch] text-base leading-relaxed text-ink" />
          </div>
        </section>

        <Notice tone="info" icon="eye" title={`Sichtbar für: ${target?.label ?? ""}`}>
          {target?.description} Die Zielgruppe lässt sich nach dem Veröffentlichen nicht mehr ändern.
        </Notice>

        <FormMessage state={state} />
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button type="submit" name="intent" value="edit" variant="secondary" icon={<Icon name="pencil" className="size-5" />}>
            Zurück zum Bearbeiten
          </Button>
          <SubmitButton name="intent" value="publish" pendingText="Wird veröffentlicht …" icon={<Icon name="send" className="size-5" />}>
            Beitrag veröffentlichen
          </SubmitButton>
        </div>
      </form>
    );
  }

  return (
    <form id="post-form" action={action} className="flex flex-col gap-6" noValidate>
      <UnsavedChangesGuard formId="post-form" />
      <FormMessage state={state} />

      <Field label="Thema" required error={state.fieldErrors?.topic}>
        {(p) => (
          <Select {...p} name="topic" defaultValue={v.topic ?? defaults.topic ?? ""}>
            <option value="" disabled>
              Bitte wählen
            </option>
            {topics.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <Field label="Titel" optional hint="Eine kurze Überschrift hilft anderen beim Finden." error={state.fieldErrors?.title}>
        {(p) => <Input {...p} name="title" maxLength={maxTitle} defaultValue={v.title ?? ""} autoComplete="off" />}
      </Field>

      <CountedTextarea
        label="Dein Text"
        name="body"
        maxLength={maxBody}
        rows={8}
        required
        hint="Schreibe in deinen eigenen Worten. Nur Text – Links werden als externe Links gekennzeichnet und ohne Vorschau angezeigt."
        defaultValue={v.body ?? ""}
        error={state.fieldErrors?.body}
      />

      <RadioCards
        name="target"
        legend="Wer kann den Beitrag sehen?"
        hint="Die Zielgruppe kann später nicht mehr geändert werden."
        required
        options={targets}
        defaultValue={v.target ?? defaults.target}
        error={state.fieldErrors?.target}
      />

      <Notice tone="neutral" icon="shield" title="Bitte beachten">
        <ul className="flex list-disc flex-col gap-1 pl-5">
          <li>Stelle keine identifizierenden Gesundheitsunterlagen ein, etwa Befunde, Arztberichte oder Fotos davon.</li>
          <li>Deine Erfahrung ist wertvoll – sie ersetzt aber keinen medizinischen Rat für andere.</li>
          <li>Dein Beitrag hat keinen Bezug zu deinem Tagebuch. Was du hier schreibst, ist eine neue, bewusste Veröffentlichung.</li>
        </ul>
      </Notice>

      <div>
        <SubmitButton name="intent" value="preview" pendingText="Vorschau wird erstellt …" icon={<Icon name="eye" className="size-5" />}>
          Vorschau ansehen
        </SubmitButton>
      </div>
    </form>
  );
}
