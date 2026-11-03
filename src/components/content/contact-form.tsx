"use client";

import Link from "next/link";
import { useActionState } from "react";
import { CountedTextarea, Field, FormMessage, Input, Select, SubmitButton } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { idle } from "@/lib/action-state";
import { submitContactAction } from "@/server/modules/content/actions";
import { CONTACT_CATEGORIES, CONTACT_MAX } from "@/server/modules/content/shared";

/** S51 Kontakt und Fehler melden (CON06). Keine Anhänge, kein Captcha, Eingaben bleiben bei Fehlern erhalten. */
export function ContactForm({
  formToken,
  defaultCategory,
  refType,
  refId,
  refTitle,
}: {
  formToken: string;
  defaultCategory?: string;
  refType?: "article" | "offer";
  refId?: string;
  refTitle?: string;
}) {
  const [state, action] = useActionState(submitContactAction, idle);
  const fe = state.fieldErrors ?? {};
  const v = state.values ?? {};

  if (state.status === "success" && state.data?.sent) {
    return (
      <div role="status" className="flex flex-col items-start gap-4 border-y border-ink py-8">
        <p className="inline-flex items-start gap-3 font-display text-[1.75rem] leading-tight tracking-[-0.015em] text-ink">
          <Icon name="check-circle" className="mt-1 size-6 shrink-0 text-success" />
          {state.message}
        </p>
        <p className="text-base text-ink-2">Bei akuter Gefahr wende dich bitte direkt an die Hilfewege auf der Sicherheitsseite.</p>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/" className="link-quiet inline-flex min-h-11 items-center font-semibold text-ink">
            Zur Startseite
          </Link>
          <Link href="/sicherheit" className="link-quiet inline-flex min-h-11 items-center font-semibold text-danger">
            Sicherheit und akute Hilfe
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-6" noValidate>
      <FormMessage state={state} />
      <input type="hidden" name="formToken" value={formToken} />
      {refType && refId && (
        <>
          <input type="hidden" name="refType" value={refType} />
          <input type="hidden" name="refId" value={refId} />
          <div className="flex items-start gap-3 rounded-[16px] border border-line bg-sunk p-4">
            <Icon name="link" className="mt-0.5 size-5 shrink-0 text-ink-2" />
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-semibold text-ink-2">{refType === "article" ? "Bezieht sich auf den Artikel" : "Bezieht sich auf das Angebot"}</p>
              <p className="font-semibold text-ink">{refTitle}</p>
            </div>
          </div>
        </>
      )}
      <Field label="Worum geht es?" error={fe.category} required>
        {(p) => (
          <Select {...p} name="category" defaultValue={(v.category as string) ?? defaultCategory ?? ""}>
            <option value="" disabled>
              Bitte wählen
            </option>
            {CONTACT_CATEGORIES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <CountedTextarea
        label="Dein Anliegen"
        name="message"
        maxLength={CONTACT_MAX}
        rows={7}
        required
        error={fe.message}
        defaultValue={(v.message as string) ?? ""}
        hint="Bitte keine medizinischen Unterlagen, Diagnosen oder Tagebuchinhalte senden. Anhänge sind nicht möglich."
      />
      <Field
        label="Antwortadresse"
        optional
        error={fe.replyEmail}
        hint="Nur, wenn du eine Antwort möchtest. Wir verwenden die Adresse ausschliesslich für dieses Anliegen."
      >
        {(p) => <Input {...p} name="replyEmail" type="email" autoComplete="email" inputMode="email" defaultValue={(v.replyEmail as string) ?? ""} />}
      </Field>
      {/* Honeypot gegen Automaten – für Menschen unsichtbar und nicht fokussierbar (CON06, ohne Captcha) */}
      <div aria-hidden="true" className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden">
        <label htmlFor="website">Bitte leer lassen</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>
      <SubmitButton size="lg" pendingText="Wird gesendet …" className="w-full sm:w-fit">
        Anliegen senden
      </SubmitButton>
    </form>
  );
}
