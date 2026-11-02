"use client";

import { useActionState } from "react";
import { Checkbox, CountedTextarea, Field, FormMessage, Input, Select, SubmitButton } from "@/components/ui/form";
import { idle } from "@/lib/action-state";
import { verifyAuditChainAction } from "@/server/modules/admin/audit-actions";
import {
  grantRoleAction,
  offboardStaffAction,
  recordAccessReviewAction,
  requestSpecialAccessAction,
  reviewSpecialAccessAction,
} from "@/server/modules/admin/role-actions";
import { useSuccessKey } from "./action-button";
import { ROLE_KEYS, ROLE_LABEL, SPECIAL_ACCESS_SCOPES } from "./labels";

/** Hash-Kette prüfen (PRI07). Ergebnis «Kette intakt» bzw. «Bruch bei Eintrag #…». */
export function VerifyChainForm() {
  const [state, action] = useActionState(verifyAuditChainAction, idle);
  return (
    <form action={action} className="flex flex-col items-start gap-3">
      <SubmitButton variant="secondary" pendingText="Kette wird geprüft …">
        Hash-Kette prüfen
      </SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}

/** Rolle vergeben (nur Administration, ACC05, PRI08). */
export function GrantRoleForm({ minDate }: { minDate: string }) {
  const [state, action] = useActionState(grantRoleAction, idle);
  const fe = state.fieldErrors ?? {};
  const v = (k: string) => (state.status === "error" ? ((state.values?.[k] as string) ?? "") : "");
  return (
    <form action={action} className="flex flex-col gap-5">
      <Field label="Konto-ID" required error={fe.accountId} hint="Vollständige Konto-ID aus der Mitgliederverwaltung.">
        {(p) => <Input {...p} name="accountId" autoComplete="off" spellCheck={false} className="font-mono" defaultValue={v("accountId")} />}
      </Field>
      <Field label="Rolle" required error={fe.role}>
        {(p) => (
          <Select {...p} name="role" defaultValue={v("role")}>
            <option value="">Bitte wählen</option>
            {ROLE_KEYS.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="Befristet bis" optional error={fe.endsAt} hint="Ohne Datum gilt die Rolle bis zum Entzug.">
        {(p) => <Input {...p} name="endsAt" type="date" min={minDate} defaultValue={v("endsAt")} />}
      </Field>
      <Field label="Ticket-Referenz" required error={fe.ticket} hint="Zum Beispiel ADM-1234.">
        {(p) => <Input {...p} name="ticket" maxLength={40} autoComplete="off" defaultValue={v("ticket")} />}
      </Field>
      <FormMessage state={state} />
      <SubmitButton pendingText="Rolle wird vergeben …" className="self-start">
        Rolle vergeben
      </SubmitButton>
    </form>
  );
}

/** Mitarbeitendenaustritt: alle Rollen entziehen und Sitzungen widerrufen (PRI08). */
export function OffboardForm({ accountId, pseudonym }: { accountId: string; pseudonym: string }) {
  const [state, action] = useActionState(offboardStaffAction, idle);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="accountId" value={accountId} />
      <Field label="Ticket-Referenz" required error={fe.ticket}>
        {(p) => <Input {...p} name="ticket" maxLength={40} autoComplete="off" />}
      </Field>
      <Checkbox
        name="confirm"
        value="yes"
        error={fe.confirm}
        label={`Alle Rollen von «${pseudonym}» entziehen und alle Sitzungen sofort widerrufen`}
      />
      <FormMessage state={state} />
      <SubmitButton variant="danger" size="sm" pendingText="Wird ausgeführt …" className="self-start">
        Austritt durchführen
      </SubmitButton>
    </form>
  );
}

/** Quartalsweise Rechteprüfung dokumentieren (PRI08). */
export function AccessReviewForm({ quarters }: { quarters: string[] }) {
  const [state, action] = useActionState(recordAccessReviewAction, idle);
  const fe = state.fieldErrors ?? {};
  const resetKey = useSuccessKey(state);
  return (
    <form action={action} className="flex flex-col gap-5">
      <Field label="Geprüftes Quartal" required error={fe.period}>
        {(p) => (
          <Select {...p} name="period" defaultValue={(state.values?.period as string) ?? quarters[0]}>
            {quarters.map((q) => (
              <option key={q} value={q}>
                {q}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <CountedTextarea
        key={resetKey}
        label="Ergebnis und Folgeschritte"
        name="note"
        maxLength={1000}
        rows={3}
        optional
        error={fe.note}
        defaultValue={state.status === "error" ? ((state.values?.note as string) ?? "") : ""}
        hint="Zum Beispiel entzogene Rollen oder offene Punkte. Keine Personendaten Dritter."
      />
      <Checkbox
        name="confirm"
        value="yes"
        error={fe.confirm}
        label="Alle aktiven Rollen, Befristungen und MFA-Status wurden geprüft."
      />
      <FormMessage state={state} />
      <SubmitButton variant="secondary" pendingText="Wird dokumentiert …" className="self-start">
        Rechteprüfung dokumentieren
      </SubmitButton>
    </form>
  );
}

/** Sonderzugriff beantragen: Ticket, Zweck, Umfang (PRD 03, PRI07). */
export function SpecialAccessRequestForm() {
  const [state, action] = useActionState(requestSpecialAccessAction, idle);
  const fe = state.fieldErrors ?? {};
  const resetKey = useSuccessKey(state);
  const v = (k: string) => (state.status === "error" ? ((state.values?.[k] as string) ?? "") : "");
  return (
    <form action={action} className="flex flex-col gap-5">
      <Field label="Ticket-Referenz" required error={fe.ticket} hint="Zum Beispiel OPS-1234.">
        {(p) => <Input {...p} name="ticket" maxLength={40} autoComplete="off" defaultValue={v("ticket")} />}
      </Field>
      <Field label="Umfang" required error={fe.scope}>
        {(p) => (
          <Select {...p} name="scope" defaultValue={v("scope")}>
            <option value="">Bitte wählen</option>
            {SPECIAL_ACCESS_SCOPES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="Betroffenes Objekt" optional hint="Technische Referenz, z. B. Fallnummer oder Objekt-ID. Keine Namen oder Inhalte.">
        {(p) => <Input {...p} name="object" maxLength={80} autoComplete="off" defaultValue={v("object")} />}
      </Field>
      <CountedTextarea
        key={resetKey}
        label="Zweck"
        name="purpose"
        maxLength={500}
        rows={3}
        required
        error={fe.purpose}
        defaultValue={v("purpose")}
        hint="Warum ist der Zugriff nötig und warum genügen die normalen Werkzeuge nicht?"
      />
      <FormMessage state={state} />
      <SubmitButton pendingText="Wird beantragt …" className="self-start">
        Sonderzugriff beantragen
      </SubmitButton>
    </form>
  );
}

/** Zweite Freigabe des Sonderzugriffs mit Befristung ≤ 60 Minuten. */
export function SpecialAccessReviewForm({ grantId }: { grantId: string }) {
  const [state, action] = useActionState(reviewSpecialAccessAction, idle);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="grantId" value={grantId} />
      <Field label="Dauer" error={state.fieldErrors?.minutes}>
        {(p) => (
          <Select {...p} name="minutes" defaultValue="30">
            <option value="15">15 Minuten</option>
            <option value="30">30 Minuten</option>
            <option value="60">60 Minuten (Maximum)</option>
          </Select>
        )}
      </Field>
      <FormMessage state={state} />
      <div className="flex flex-wrap gap-2">
        <SubmitButton name="decision" value="approve" size="sm" pendingText="Wird gespeichert …">
          Freigeben
        </SubmitButton>
        <SubmitButton name="decision" value="reject" size="sm" variant="quiet-danger" pendingText="Wird gespeichert …">
          Ablehnen
        </SubmitButton>
      </div>
    </form>
  );
}
