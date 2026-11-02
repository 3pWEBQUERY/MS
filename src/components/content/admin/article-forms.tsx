"use client";

import { useActionState } from "react";
import { Checkbox, CountedTextarea, Field, FormMessage, Input, RadioCards, Select, SubmitButton, Textarea, UnsavedChangesGuard } from "@/components/ui/form";
import { idle } from "@/lib/action-state";
import {
  addSourceAction,
  createArticleAction,
  reviewVersionAction,
  saveVersionAction,
  withdrawArticleAction,
} from "@/server/modules/content/editorial-actions";
import { HiddenFields } from "./action-form";

type Option = { id: string; name: string };
type MediaOption = { id: string; filename: string; altText: string };

export type VersionDefaults = {
  title: string;
  summary: string;
  body: string;
  authorDisplay: string;
  topicId: string;
  readingMinutes: number;
  isMedical: boolean;
  coverMediaId: string | null;
};

const BODY_HINT =
  "Einfaches Textformat: Leerzeile = neuer Absatz, «## » am Zeilenanfang = Zwischentitel, «- » = Listenpunkt. Kein HTML. Kurze Absätze, klare Zwischentitel (PRD 12).";

/** S56: Artikel anlegen (Version 1) oder Entwurf bearbeiten (CON02). */
export function ArticleVersionForm({
  mode,
  topics,
  media,
  defaults,
  versionId,
  version,
}: {
  mode: "create" | "edit";
  topics: Option[];
  media: MediaOption[];
  defaults: VersionDefaults;
  versionId?: string;
  version?: number;
}) {
  const [state, action] = useActionState(mode === "create" ? createArticleAction : saveVersionAction, idle);
  const fe = state.fieldErrors ?? {};
  const v = (k: string, fallback: string) => (state.values?.[k] as string | undefined) ?? fallback;
  const formId = mode === "create" ? "artikel-neu" : `version-${versionId}`;
  return (
    <form id={formId} action={action} className="flex max-w-3xl flex-col gap-6" noValidate>
      <UnsavedChangesGuard formId={formId} />
      <FormMessage state={state} />
      {mode === "edit" && versionId && <HiddenFields fields={{ versionId, version: version ?? 1 }} />}
      {mode === "create" && (
        <Field
          label="Adresse (Slug)"
          required
          error={fe.slug}
          hint="Erscheint in der URL /wissen/… und lässt sich später nicht ändern. Nur Kleinbuchstaben, Ziffern und Bindestriche."
        >
          {(p) => <Input {...p} name="slug" defaultValue={v("slug", "")} autoComplete="off" spellCheck={false} />}
        </Field>
      )}
      <Field label="Titel" required error={fe.title}>
        {(p) => <Input {...p} name="title" defaultValue={v("title", defaults.title)} maxLength={140} />}
      </Field>
      <CountedTextarea
        label="Kurzfassung"
        name="summary"
        maxLength={600}
        rows={4}
        required
        error={fe.summary}
        defaultValue={v("summary", defaults.summary)}
        hint="Zwei bis vier Sätze in einfacher Sprache. Sie wird über dem Volltext hervorgehoben."
      />
      <CountedTextarea
        label="Volltext"
        name="body"
        maxLength={40000}
        rows={22}
        required
        error={fe.body}
        defaultValue={v("body", defaults.body)}
        hint={BODY_HINT}
      />
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Thema" required error={fe.topicId} hint={mode === "edit" ? "Eine Änderung gilt sofort für den Artikel." : undefined}>
          {(p) => (
            <Select {...p} name="topicId" defaultValue={v("topicId", defaults.topicId)}>
              <option value="">Bitte wählen</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Lesezeit in Minuten" required error={fe.readingMinutes}>
          {(p) => (
            <Input {...p} name="readingMinutes" type="number" inputMode="numeric" min={1} max={60} defaultValue={v("readingMinutes", String(defaults.readingMinutes))} />
          )}
        </Field>
      </div>
      <Field label="Angezeigte Autorenschaft" required error={fe.authorDisplay} hint="Zum Beispiel «Redaktion MS Plattform». Keine erfundenen Personen.">
        {(p) => <Input {...p} name="authorDisplay" defaultValue={v("authorDisplay", defaults.authorDisplay)} maxLength={80} />}
      </Field>
      <Field label="Titelbild" optional error={fe.coverMediaId} hint="Aus der Medienbibliothek. Der Alt-Text des Bildes wird übernommen.">
        {(p) => (
          <Select {...p} name="coverMediaId" defaultValue={v("coverMediaId", defaults.coverMediaId ?? "")}>
            <option value="">Kein Titelbild</option>
            {media.map((m) => (
              <option key={m.id} value={m.id}>
                {m.filename} – {m.altText.slice(0, 60)}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Checkbox
        name="isMedical"
        defaultChecked={state.values ? state.values.isMedical === "on" : defaults.isMedical}
        label="Medizinischer Inhalt"
        description="Medizinische Artikel brauchen mindestens eine Quelle und die Freigabe durch die medizinische Prüfung (CON01, CON02)."
      />
      <SubmitButton pendingText="Wird gespeichert …" className="w-full sm:w-fit">
        {mode === "create" ? "Entwurf anlegen" : "Entwurf speichern"}
      </SubmitButton>
    </form>
  );
}

/** Quelle zu einer Entwurfsversion hinzufügen (PRD 09 SourceReference). */
export function SourceForm({ versionId }: { versionId: string }) {
  const [state, action] = useActionState(addSourceAction, idle);
  const fe = state.fieldErrors ?? {};
  const v = (k: string) => (state.values?.[k] as string | undefined) ?? "";
  return (
    <form action={action} className="flex flex-col gap-5 rounded-[16px] border border-line bg-surface p-4 sm:p-5" noValidate>
      <HiddenFields fields={{ versionId }} />
      <p className="font-semibold text-ink">Quelle hinzufügen</p>
      <FormMessage state={state} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Titel" required error={fe.title}>
          {(p) => <Input {...p} name="title" defaultValue={v("title")} />}
        </Field>
        <Field label="Herausgeber" required error={fe.publisher}>
          {(p) => <Input {...p} name="publisher" defaultValue={v("publisher")} />}
        </Field>
        <Field label="Adresse" optional error={fe.url} hint="Vollständige https-Adresse.">
          {(p) => <Input {...p} name="url" type="url" inputMode="url" defaultValue={v("url")} spellCheck={false} />}
        </Field>
        <Field label="Datum oder Stand" optional error={fe.publishedOn} hint="Zum Beispiel «2025» oder «abgerufen am 2. November 2026».">
          {(p) => <Input {...p} name="publishedOn" defaultValue={v("publishedOn")} />}
        </Field>
      </div>
      <Field label="Rechtehinweis" optional error={fe.rightsNote} hint="Zum Beispiel «Verweis, keine Übernahme von Text» (CON03).">
        {(p) => <Input {...p} name="rightsNote" defaultValue={v("rightsNote")} />}
      </Field>
      <SubmitButton variant="secondary" pendingText="Wird hinzugefügt …" className="w-full sm:w-fit">
        Quelle hinzufügen
      </SubmitButton>
    </form>
  );
}

/** Fachliche Prüfung: freigeben oder «Änderungen nötig» (CON02, CON03, AT08). */
export function ReviewForm({
  versionId,
  defaultDue,
  maxDue,
  defaultReviewer,
}: {
  versionId: string;
  defaultDue: string;
  maxDue: string;
  defaultReviewer: string;
}) {
  const [state, action] = useActionState(reviewVersionAction, idle);
  const fe = state.fieldErrors ?? {};
  const v = (k: string, f = "") => (state.values?.[k] as string | undefined) ?? f;
  return (
    <form action={action} className="flex flex-col gap-6" noValidate>
      <HiddenFields fields={{ versionId }} />
      <FormMessage state={state} />
      <RadioCards
        name="decision"
        legend="Entscheid"
        required
        error={fe.decision}
        defaultValue={v("decision")}
        columns={2}
        options={[
          { value: "approved", label: "Freigeben", description: "Inhalt ist fachlich korrekt und verständlich." },
          { value: "changes_requested", label: "Änderungen nötig", description: "Zurück an die Redaktion mit Kommentar." },
        ]}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Angezeigte Prüfstelle" required error={fe.reviewerDisplay} hint="Erscheint öffentlich beim Artikel.">
          {(p) => <Input {...p} name="reviewerDisplay" defaultValue={v("reviewerDisplay", defaultReviewer)} />}
        </Field>
        <Field label="Fachgebiet" required error={fe.specialty} hint="Zum Beispiel «Neurologie» oder «Sozialversicherungsrecht».">
          {(p) => <Input {...p} name="specialty" defaultValue={v("specialty")} />}
        </Field>
      </div>
      <Field label="Nächster Prüftermin" error={fe.nextReviewDueAt} hint="Nur bei Freigabe. Spätestens nach zwölf Monaten, bei dynamischen Themen früher (CON03).">
        {(p) => <Input {...p} name="nextReviewDueAt" type="date" max={maxDue} defaultValue={v("nextReviewDueAt", defaultDue)} />}
      </Field>
      <Field label="Kommentar" error={fe.comment} hint="Intern. Bei «Änderungen nötig» bitte konkret beschreiben, was zu ändern ist.">
        {(p) => <Textarea {...p} name="comment" rows={5} maxLength={2000} defaultValue={v("comment")} />}
      </Field>
      <SubmitButton pendingText="Entscheid wird gespeichert …" className="w-full sm:w-fit">
        Entscheid speichern
      </SubmitButton>
    </form>
  );
}

/** Sofortiger Rückzug mit internem Grund (CON03: dringende Korrektur). */
export function WithdrawForm({ articleId }: { articleId: string }) {
  const [state, action] = useActionState(withdrawArticleAction, idle);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <HiddenFields fields={{ articleId }} />
      <FormMessage state={state} />
      <Field label="Grund für den Rückzug" required error={fe.reason} hint="Nur intern sichtbar. Der Artikel verschwindet sofort aus Ansicht, Suche und Empfehlungen.">
        {(p) => <Textarea {...p} name="reason" rows={3} maxLength={500} defaultValue={(state.values?.reason as string) ?? ""} />}
      </Field>
      <SubmitButton variant="danger" pendingText="Wird zurückgezogen …" className="w-full sm:w-fit">
        Sofort zurückziehen
      </SubmitButton>
    </form>
  );
}
