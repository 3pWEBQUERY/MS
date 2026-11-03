"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { CountedTextarea, FormMessage, RadioCards, SubmitButton } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { Notice, PlainText } from "@/components/ui/primitives";
import { idle } from "@/lib/action-state";
import { REPORT_REASONS } from "@/lib/catalog";
import { cn } from "@/lib/cn";
import { createReportAction } from "@/server/modules/messaging/safety-actions";

export type SelectableMessage = {
  id: string;
  mine: boolean;
  body: string;
  time: string;
  authorLabel: string;
};

const MAX_MESSAGES = 10;

/**
 * S42 Inhalt melden (SAF02, F06): Grund, optionale Erläuterung, bei Chats bis zu zehn
 * bereits sichtbare Nachrichten. «Akute Gefahr» zeigt sofort den Weg zu Notruf und Hilfe.
 */
export function ReportForm({
  type,
  id,
  conversationId,
  messages,
  preselected,
  backHref,
}: {
  type: string;
  id: string;
  conversationId?: string;
  messages?: SelectableMessage[];
  preselected?: string;
  backHref: string;
}) {
  const [state, action] = useActionState(createReportAction, idle);
  const [reason, setReason] = useState<string>((state.values?.reason as string) ?? "");
  const [selected, setSelected] = useState<string[]>(() => {
    const fromState = state.values?.messageIds;
    if (Array.isArray(fromState)) return fromState;
    return preselected ? [preselected] : [];
  });

  if (state.status === "success" && typeof state.data?.receipt === "string") {
    const subject = state.data.subjectAccountId as string | null;
    return (
      <div className="flex flex-col gap-6">
        <FormMessage state={state} />
        {state.data.acute === true && <AcuteNotice />}
        <div className="flex flex-col gap-2 rounded-[20px] border border-line bg-surface p-5 sm:p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.08em] text-ink-2">Belegnummer</p>
          <p className="font-mono text-2xl font-semibold tracking-[0.04em] text-ink">{state.data.receipt}</p>
          <p className="text-base text-ink-2">
            Die Moderation prüft deine Meldung in den Betriebszeiten. Den Stand siehst du unter «Meine Meldungen». Die gemeldete
            Person erfährt nicht, wer gemeldet hat.
          </p>
        </div>
        {typeof state.data.nextServiceStart === "string" && (
          <OutsideHoursNotice next={state.data.nextServiceStart} hours={String(state.data.operatingHours ?? "")} />
        )}
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/meldungen" variant="primary">
            Meine Meldungen
          </ButtonLink>
          {subject && (
            <ButtonLink href={`/community/blockiert/neu?mitglied=${subject}`} variant="secondary" icon={<Icon name="ban" className="size-5" />}>
              Person zusätzlich blockieren
            </ButtonLink>
          )}
          <ButtonLink href={backHref} variant="ghost">
            Zurück
          </ButtonLink>
        </div>
      </div>
    );
  }

  const tooMany = selected.length > MAX_MESSAGES;

  return (
    <form action={action} className="flex flex-col gap-8" noValidate>
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="id" value={id} />
      {conversationId && <input type="hidden" name="conversationId" value={conversationId} />}
      <FormMessage state={state} />

      <div onChange={(e) => setReason((e.target as HTMLInputElement).value)}>
        <RadioCards
          name="reason"
          legend="Grund der Meldung"
          required
          defaultValue={reason}
          error={state.fieldErrors?.reason}
          options={REPORT_REASONS.map(([value, label]) => ({
            value,
            label,
            description: REASON_HINTS[value],
          }))}
        />
      </div>

      {reason === "acute_danger" && <AcuteNotice />}

      {messages && (
        <fieldset className="flex flex-col gap-3" aria-describedby="msg-hint">
          <legend className="mb-1 text-base font-semibold text-ink">Nachrichten als Beleg auswählen</legend>
          <p id="msg-hint" className="-mt-2 text-sm text-ink-2">
            Wähle bis zu zehn Nachrichten. Nur diese werden der Moderation gezeigt – der restliche Verlauf bleibt privat.{" "}
            <span className={cn("tabular font-semibold", tooMany ? "text-danger" : "text-ink")} aria-live="polite">
              {selected.length} von {MAX_MESSAGES} ausgewählt
            </span>
          </p>
          {state.fieldErrors?.messageIds && <p className="text-sm font-medium text-danger">{state.fieldErrors.messageIds}</p>}
          {messages.length === 0 ? (
            <p className="rounded-[16px] bg-sunk p-4 text-base text-ink-2">In diesem Gespräch gibt es keine Nachrichten, die gemeldet werden können.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {messages.map((m) => {
                const checked = selected.includes(m.id);
                const disabled = !checked && selected.length >= MAX_MESSAGES;
                return (
                  <li key={m.id}>
                    <label
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-[12px] border border-line-2 bg-surface p-4 transition-colors hover:border-field has-[:checked]:border-ink has-[:checked]:bg-raised has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus)]",
                        disabled && "cursor-not-allowed opacity-55",
                      )}
                    >
                      <span className="relative mt-0.5 inline-flex size-6 shrink-0">
                        <input
                          type="checkbox"
                          name="messageIds"
                          value={m.id}
                          checked={checked}
                          disabled={disabled}
                          onChange={(e) =>
                            setSelected((prev) => (e.target.checked ? [...prev, m.id] : prev.filter((x) => x !== m.id)))
                          }
                          className="peer size-6 cursor-pointer appearance-none rounded-[6px] border border-field bg-surface outline-none transition-colors checked:border-ink checked:bg-ink"
                        />
                        <Icon
                          name="check"
                          className="pointer-events-none absolute inset-0 m-auto size-4 text-ink-inverse opacity-0 peer-checked:opacity-100"
                          strokeWidth={2.5}
                        />
                      </span>
                      <span className="flex min-w-0 flex-col gap-1">
                        <span className="text-sm font-semibold text-ink-2">
                          {m.authorLabel} · {m.time}
                        </span>
                        <PlainText text={m.body} className="text-base text-ink" />
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </fieldset>
      )}

      <CountedTextarea
        name="details"
        label="Erläuterung"
        optional
        maxLength={1000}
        rows={4}
        defaultValue={(state.values?.details as string) ?? ""}
        error={state.fieldErrors?.details}
        hint="Was soll die Moderation wissen? Bitte keine Gesundheitsdaten anderer Personen. Wird verschlüsselt gespeichert."
      />

      <Notice tone="neutral" title="So geht es weiter">
        Du erhältst sofort eine Belegnummer. Die Moderation prüft in den Betriebszeiten und informiert Betroffene ohne deine
        Identität. Du kannst die Person zusätzlich blockieren.
      </Notice>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
        <SubmitButton size="lg" pendingText="Wird gesendet …" disabled={tooMany} icon={<Icon name="flag" className="size-5" />}>
          Meldung senden
        </SubmitButton>
        <Link href={backHref} className="inline-flex h-12 items-center px-2 text-base font-medium text-ink-2 underline underline-offset-4 hover:text-ink">
          Abbrechen
        </Link>
      </div>
    </form>
  );
}

const REASON_HINTS: Record<string, string> = {
  harassment: "Beleidigung, Drohung, wiederholte unerwünschte Kontaktversuche",
  privacy: "Persönliche Daten, Fotos oder Kontaktangaben ohne Einwilligung",
  dangerous_medical: "Anleitung, eine Therapie eigenmächtig zu ändern, oder gefährliche Heilsversprechen",
  spam_fraud: "Werbung, Betrugsversuch, Geldforderung",
  acute_danger: "Jemand ist unmittelbar in Gefahr",
  other: "Etwas anderes, das gegen die Regeln verstösst",
};

/**
 * Kapitel 10: Ausserhalb der Betriebszeit nennt die automatische Eingangsbestätigung den nächsten
 * Dienstbeginn und verweist unabhängig davon auf Sicherheit und akute Hilfe (S49).
 */
function OutsideHoursNotice({ next, hours }: { next: string; hours: string }) {
  return (
    <Notice tone="info" icon="clock" title="Die Moderation ist gerade nicht im Dienst">
      <p>
        Deine Meldung ist sicher eingegangen. Die Moderation ist {hours || "zu festen Zeiten"} im Dienst. Nächster Dienstbeginn:{" "}
        <strong>{next}</strong> (Schweizer Zeit).
      </p>
      <p className="mt-1">
        Wenn jemand in Gefahr ist, warte nicht: Ruf <a href="tel:144">144</a> an. Weitere sofort erreichbare Hilfewege findest du
        unter <Link href="/sicherheit">Sicherheit und akute Hilfe</Link>.
      </p>
    </Notice>
  );
}

function AcuteNotice() {
  return (
    <Notice tone="danger" role="alert" title="Bei akuter Gefahr: Notruf 144">
      Die Moderation ist nicht rund um die Uhr erreichbar und kann keinen Notruf ersetzen. Wenn jemand unmittelbar in Gefahr
      ist, ruf sofort <a href="tel:144">144</a> an. Weitere Hilfewege findest du unter{" "}
      <Link href="/sicherheit">Sicherheit und akute Hilfe</Link>.
    </Notice>
  );
}
