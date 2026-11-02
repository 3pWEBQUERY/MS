"use client";

import { useActionState } from "react";
import { Checkbox, Field, FormMessage, Input, RadioCards, Select, SubmitButton, Textarea, UnsavedChangesGuard } from "@/components/ui/form";
import { Notice } from "@/components/ui/primitives";
import { idle } from "@/lib/action-state";
import { saveGroupAction } from "@/server/modules/community/admin-actions";

export type GroupFormDefaults = {
  id?: string;
  version?: number;
  title: string;
  slug: string;
  topicId: string;
  description: string;
  rules: string;
  rulesVersion: string;
  type: "open" | "closed" | "";
  discoverable: boolean;
  moderatorAccountId: string;
};

/** S55: Gruppe anlegen oder bearbeiten (COM06). Zugangstypwechsel nur mit expliziter Bestätigung (COM08). */
export function GroupForm({
  defaults,
  topics,
  moderators,
}: {
  defaults: GroupFormDefaults;
  topics: { id: string; name: string }[];
  moderators: { accountId: string; pseudonym: string }[];
}) {
  const [state, action] = useActionState(saveGroupAction, idle);
  const v = (state.values ?? {}) as Record<string, string | undefined>;
  const isEdit = Boolean(defaults.id);
  const err = state.fieldErrors ?? {};
  return (
    <form id="group-form" action={action} className="flex max-w-2xl flex-col gap-6" noValidate>
      <UnsavedChangesGuard formId="group-form" />
      {defaults.id && <input type="hidden" name="groupId" value={defaults.id} />}
      {defaults.version !== undefined && <input type="hidden" name="version" value={defaults.version} />}
      <FormMessage state={state} />

      <Field label="Titel" required error={err.title}>
        {(p) => <Input {...p} name="title" maxLength={80} defaultValue={v.title ?? defaults.title} autoComplete="off" />}
      </Field>
      <Field label="Adresse (Slug)" required hint="Erscheint in der Adresse: /community/gruppen/…" error={err.slug}>
        {(p) => <Input {...p} name="slug" maxLength={60} defaultValue={v.slug ?? defaults.slug} autoComplete="off" spellCheck={false} />}
      </Field>
      <Field label="Thema" required error={err.topicId}>
        {(p) => (
          <Select {...p} name="topicId" defaultValue={v.topicId ?? defaults.topicId}>
            <option value="" disabled>
              Bitte wählen
            </option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field
        label="Beschreibung"
        required
        hint="Für alle sichtbar, die die Gruppe finden können. Keine Inhalte aus der Gruppe."
        error={err.description}
      >
        {(p) => <Textarea {...p} name="description" rows={3} maxLength={600} defaultValue={v.description ?? defaults.description} />}
      </Field>
      <Field label="Regeln der Gruppe" required hint="Mitglieder bestätigen diese Regeln vor dem Beitritt." error={err.rules}>
        {(p) => <Textarea {...p} name="rules" rows={8} maxLength={3000} defaultValue={v.rules ?? defaults.rules} />}
      </Field>
      <Field
        label="Regelfassung"
        required
        hint="Bei inhaltlichen Änderungen eine neue Fassung angeben. Mitglieder bestätigen sie vor dem nächsten Beitrag."
        error={err.rulesVersion}
      >
        {(p) => <Input {...p} name="rulesVersion" maxLength={40} defaultValue={v.rulesVersion ?? defaults.rulesVersion} autoComplete="off" />}
      </Field>

      <RadioCards
        name="type"
        legend="Zugangstyp"
        required
        defaultValue={v.type ?? defaults.type}
        error={err.type}
        options={[
          { value: "open", label: "Offene Gruppe", description: "Beitritt nach Annahme der Regeln, ohne Entscheidung." },
          { value: "closed", label: "Geschlossene Gruppe", description: "Aufnahme nur nach Anfrage und Entscheidung durch die Moderation." },
        ]}
      />
      <Checkbox
        name="discoverable"
        defaultChecked={v.discoverable !== undefined ? v.discoverable === "on" : defaults.discoverable}
        label="Geschlossene Gruppe ist auffindbar"
        description="Ohne Haken ist eine geschlossene Gruppe verborgen: Sie fehlt in Übersicht und Suche. Offene Gruppen sind immer auffindbar."
      />

      <Field label="Verantwortliche Moderation" required error={err.moderatorAccountId}>
        {(p) => (
          <Select {...p} name="moderatorAccountId" defaultValue={v.moderatorAccountId ?? defaults.moderatorAccountId}>
            <option value="" disabled>
              Bitte wählen
            </option>
            {moderators.map((m) => (
              <option key={m.accountId} value={m.accountId}>
                {m.pseudonym}
              </option>
            ))}
          </Select>
        )}
      </Field>

      {isEdit && (
        <Notice tone="warning" title="Zugangstyp ändern">
          <p>
            Ein Wechsel ändert, wer Inhalte sehen kann. Bei «geschlossen» → «offen» werden bisherige Beiträge für alle künftigen
            Mitglieder lesbar. Prüfe vorher die bestehenden Inhalte und informiere die Mitglieder.
          </p>
          <div className="mt-3">
            <Checkbox
              name="confirmTypeChange"
              label="Ich habe die Folgen des Zugangstypwechsels geprüft."
              error={err.confirmTypeChange}
            />
          </div>
        </Notice>
      )}

      <div>
        <SubmitButton pendingText="Wird gespeichert …">{isEdit ? "Änderungen speichern" : "Gruppe anlegen"}</SubmitButton>
      </div>
    </form>
  );
}
