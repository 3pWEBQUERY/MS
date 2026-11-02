"use client";

import { useActionState } from "react";
import { Checkbox, CountedTextarea, Field, FormMessage, Input, Select, SubmitButton, Textarea, UnsavedChangesGuard } from "@/components/ui/form";
import { idle } from "@/lib/action-state";
import { CANTONS, HELP_TOPICS } from "@/lib/catalog";
import {
  hideOfferAction,
  saveOfferAction,
  saveSafetyContactAction,
  setOfferFlagAction,
  verifyOfferAction,
  verifySafetyContactAction,
} from "@/server/modules/content/directory-actions";
import { LANGUAGES, VERIFY_METHODS } from "@/server/modules/content/shared";
import { HiddenFields } from "./action-form";

export type OfferDefaults = {
  slug: string;
  organization: string;
  title: string;
  summary: string;
  description: string;
  topicSlugs: string[];
  cantons: string[];
  languages: string[];
  audience: string;
  responsibility: string;
  access: string;
  costNote: string;
  contactWay: string;
  url: string;
};

function CheckboxGroup({
  legend,
  name,
  options,
  selected,
  error,
  hint,
  columns = "sm:grid-cols-2",
}: {
  legend: string;
  name: string;
  options: readonly (readonly [string, string])[];
  selected: string[];
  error?: string;
  hint?: string;
  columns?: string;
}) {
  return (
    <fieldset className="flex flex-col gap-3" aria-describedby={error ? `${name}-err` : undefined}>
      <legend className="mb-1 text-base font-semibold text-ink">
        {legend} <span className="text-sm font-normal text-ink-2">(erforderlich)</span>
      </legend>
      {hint && <p className="-mt-2 text-sm text-ink-2">{hint}</p>}
      <div className={`grid gap-3 ${columns}`}>
        {options.map(([value, label]) => (
          <Checkbox key={value} name={name} value={value} label={label} defaultChecked={selected.includes(value)} />
        ))}
      </div>
      {error && (
        <p id={`${name}-err`} className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}

/** S57: Angebot anlegen oder bearbeiten (CON04, CON05). */
export function OfferForm({ offerId, version, defaults }: { offerId?: string; version?: number; defaults: OfferDefaults }) {
  const [state, action] = useActionState(saveOfferAction, idle);
  const fe = state.fieldErrors ?? {};
  const v = (k: keyof OfferDefaults) => (state.values?.[k] as string | undefined) ?? (defaults[k] as string);
  const arr = (k: "topicSlugs" | "cantons" | "languages") => (state.values?.[k] as string[] | undefined) ?? defaults[k];
  const formId = `angebot-${offerId ?? "neu"}`;
  return (
    <form id={formId} action={action} className="flex max-w-3xl flex-col gap-6" noValidate>
      <UnsavedChangesGuard formId={formId} />
      <FormMessage state={state} />
      {offerId && <HiddenFields fields={{ offerId, version: version ?? 1 }} />}
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Organisation" required error={fe.organization}>
          {(p) => <Input {...p} name="organization" defaultValue={v("organization")} />}
        </Field>
        <Field label="Adresse (Slug)" required error={fe.slug} hint="Erscheint als /hilfe/…">
          {(p) => <Input {...p} name="slug" defaultValue={v("slug")} spellCheck={false} />}
        </Field>
      </div>
      <Field label="Titel des Angebots" required error={fe.title}>
        {(p) => <Input {...p} name="title" defaultValue={v("title")} />}
      </Field>
      <CountedTextarea label="Kurzbeschreibung" name="summary" maxLength={300} rows={3} required error={fe.summary} defaultValue={v("summary")} />
      <CountedTextarea
        label="Beschreibung"
        name="description"
        maxLength={4000}
        rows={8}
        required
        error={fe.description}
        defaultValue={v("description")}
        hint="Leistungen allgemein und zurückhaltend beschreiben («gemäss Anbieter»). Keine Bewertung, keine Erfolgsversprechen."
      />
      <CheckboxGroup legend="Themen" name="topicSlugs" options={HELP_TOPICS} selected={arr("topicSlugs")} error={fe.topicSlugs} />
      <CheckboxGroup
        legend="Region"
        name="cantons"
        options={[["CH", "Ganze Schweiz"], ...CANTONS]}
        selected={arr("cantons")}
        error={fe.cantons}
        hint="«Ganze Schweiz» für schweizweit verfügbare Angebote; zusätzlich Kantone für regionale Schwerpunkte."
        columns="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
      />
      <CheckboxGroup legend="Sprachen" name="languages" options={LANGUAGES} selected={arr("languages")} error={fe.languages} columns="sm:grid-cols-3" />
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Zielgruppe" required error={fe.audience}>
          {(p) => <Textarea {...p} name="audience" rows={2} defaultValue={v("audience")} className="min-h-20" />}
        </Field>
        <Field label="Zuständigkeit" required error={fe.responsibility}>
          {(p) => <Textarea {...p} name="responsibility" rows={2} defaultValue={v("responsibility")} className="min-h-20" />}
        </Field>
        <Field label="Zugang" required error={fe.access} hint="Wie man das Angebot nutzt, z. B. Anmeldung, Zuweisung.">
          {(p) => <Textarea {...p} name="access" rows={2} defaultValue={v("access")} className="min-h-20" />}
        </Field>
        <Field label="Kostenhinweis" required error={fe.costNote} hint="Standard: «Kosten gemäss Anbieter».">
          {(p) => <Textarea {...p} name="costNote" rows={2} defaultValue={v("costNote")} className="min-h-20" />}
        </Field>
      </div>
      <Field label="Kontaktweg" required error={fe.contactWay} hint="Keine erfundenen Telefonnummern – z. B. «Kontaktformular und Telefonnummer auf der Website».">
        {(p) => <Input {...p} name="contactWay" defaultValue={v("contactWay")} />}
      </Field>
      <Field label="Geprüfte Website" required error={fe.url} hint="Offizielle https-Adresse ohne Parameter.">
        {(p) => <Input {...p} name="url" type="url" inputMode="url" defaultValue={v("url")} spellCheck={false} />}
      </Field>
      <SubmitButton pendingText="Wird gespeichert …" className="w-full sm:w-fit">
        {offerId ? "Änderungen speichern" : "Angebot anlegen"}
      </SubmitButton>
    </form>
  );
}

/** Prüfung erfassen (CON05: spätestens nach sechs Monaten; SAF06: monatlich). */
export function VerifyForm({
  target,
  targetId,
  today,
  defaultDue,
  maxDue,
  showClearFlag,
}: {
  target: "offer" | "safety";
  targetId: string;
  today: string;
  defaultDue: string;
  maxDue: string;
  showClearFlag?: boolean;
}) {
  const [state, action] = useActionState(target === "offer" ? verifyOfferAction : verifySafetyContactAction, idle);
  const fe = state.fieldErrors ?? {};
  const v = (k: string, f = "") => (state.values?.[k] as string | undefined) ?? f;
  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <HiddenFields fields={target === "offer" ? { offerId: targetId } : { contactId: targetId }} />
      <FormMessage state={state} />
      <Field label="Prüfverfahren" required error={fe.method}>
        {(p) => (
          <Select {...p} name="method" defaultValue={v("method")}>
            <option value="" disabled>
              Bitte wählen
            </option>
            {VERIFY_METHODS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        )}
      </Field>
      {target === "safety" && (
        <Field label="Prüfende Stelle" required error={fe.verifiedBy} hint="Erscheint öffentlich, z. B. «Fachstelle Krisenintervention (Name der Stelle)».">
          {(p) => <Input {...p} name="verifiedBy" defaultValue={v("verifiedBy")} />}
        </Field>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Geprüft am" required error={fe.verifiedOn}>
          {(p) => <Input {...p} name="verifiedOn" type="date" max={today} defaultValue={v("verifiedOn", today)} />}
        </Field>
        <Field label="Nächste Prüfung" required error={fe.nextDueAt} hint={target === "offer" ? "Spätestens nach sechs Monaten." : "Spätestens nach einem Monat."}>
          {(p) => <Input {...p} name="nextDueAt" type="date" max={maxDue} defaultValue={v("nextDueAt", defaultDue)} />}
        </Field>
      </div>
      <Field label="Notiz" optional error={fe.note} hint="Intern, ohne Personendaten.">
        {(p) => <Textarea {...p} name="note" rows={3} maxLength={500} defaultValue={v("note")} />}
      </Field>
      {showClearFlag && <Checkbox name="clearFlag" defaultChecked label="Änderungshinweis damit erledigt" />}
      <SubmitButton pendingText="Wird gespeichert …" className="w-full sm:w-fit">
        Prüfung erfassen
      </SubmitButton>
    </form>
  );
}

export function HideOfferForm({ offerId }: { offerId: string }) {
  const [state, action] = useActionState(hideOfferAction, idle);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <HiddenFields fields={{ offerId }} />
      <FormMessage state={state} />
      <Field label="Grund für das Ausblenden" required error={state.fieldErrors?.reason} hint="Nur intern sichtbar. Öffentlich werden Kontaktdaten ausgeblendet und Alternativen gezeigt.">
        {(p) => <Input {...p} name="reason" defaultValue={(state.values?.reason as string) ?? ""} maxLength={300} />}
      </Field>
      <SubmitButton variant="quiet-danger" pendingText="Wird ausgeblendet …" className="w-full sm:w-fit">
        Angebot ausblenden
      </SubmitButton>
    </form>
  );
}

export function FlagForm({ offerId, flagged, note }: { offerId: string; flagged: boolean; note: string | null }) {
  const [state, action] = useActionState(setOfferFlagAction, idle);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <HiddenFields fields={{ offerId, flag: flagged ? "" : "on" }} />
      <FormMessage state={state} />
      {flagged ? (
        <p className="text-base text-ink">
          <span className="font-semibold">Offener Hinweis:</span> {note ?? "ohne Notiz"}
        </p>
      ) : (
        <Field label="Was ist zu prüfen?" required error={state.fieldErrors?.note}>
          {(p) => <Input {...p} name="note" defaultValue={(state.values?.note as string) ?? ""} maxLength={300} />}
        </Field>
      )}
      <SubmitButton variant="secondary" pendingText="Wird gespeichert …" className="w-full sm:w-fit">
        {flagged ? "Hinweis als erledigt markieren" : "Änderungsflag setzen"}
      </SubmitButton>
    </form>
  );
}

export type SafetyDefaults = { name: string; description: string; phone: string; url: string; availability: string; region: string; sort: number };

/** S49-Pflege: Hilfeweg anlegen oder bearbeiten. Geänderte Kontaktwege gehen erst nach Verifikation online (SAF06). */
export function SafetyContactForm({ contactId, defaults }: { contactId?: string; defaults: SafetyDefaults }) {
  const [state, action] = useActionState(saveSafetyContactAction, idle);
  const fe = state.fieldErrors ?? {};
  const v = (k: keyof SafetyDefaults) => (state.values?.[k] as string | undefined) ?? String(defaults[k]);
  return (
    <form action={action} className="flex max-w-3xl flex-col gap-6" noValidate>
      <FormMessage state={state} />
      {contactId && <HiddenFields fields={{ contactId }} />}
      <Field label="Name" required error={fe.name} hint="Zum Beispiel «Sanitätsnotruf 144».">
        {(p) => <Input {...p} name="name" defaultValue={v("name")} />}
      </Field>
      <Field label="Wofür" required error={fe.description}>
        {(p) => <Textarea {...p} name="description" rows={3} defaultValue={v("description")} maxLength={400} />}
      </Field>
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Telefonnummer" error={fe.phone} hint="Nur offizielle, verifizierte Nummern.">
          {(p) => <Input {...p} name="phone" type="tel" inputMode="tel" defaultValue={v("phone")} />}
        </Field>
        <Field label="Website" optional error={fe.url}>
          {(p) => <Input {...p} name="url" type="url" inputMode="url" defaultValue={v("url")} spellCheck={false} />}
        </Field>
        <Field label="Erreichbarkeit" required error={fe.availability} hint="Zum Beispiel «Rund um die Uhr».">
          {(p) => <Input {...p} name="availability" defaultValue={v("availability")} />}
        </Field>
        <Field label="Region" required error={fe.region}>
          {(p) => <Input {...p} name="region" defaultValue={v("region")} />}
        </Field>
        <Field label="Reihenfolge" error={fe.sort} hint="Kleinere Zahlen stehen weiter oben.">
          {(p) => <Input {...p} name="sort" type="number" inputMode="numeric" min={0} max={999} defaultValue={v("sort")} />}
        </Field>
      </div>
      <SubmitButton pendingText="Wird gespeichert …" className="w-full sm:w-fit">
        {contactId ? "Änderungen speichern" : "Hilfeweg anlegen"}
      </SubmitButton>
    </form>
  );
}
