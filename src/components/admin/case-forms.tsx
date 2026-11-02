"use client";

import { useActionState, useState } from "react";
import { Checkbox, CountedTextarea, Field, FormMessage, RadioCards, Select, SubmitButton } from "@/components/ui/form";
import { Notice } from "@/components/ui/primitives";
import { idle } from "@/lib/action-state";
import {
  assignCaseAction,
  decideCaseAction,
  reviewMeasureAction,
  setPriorityAction,
  takeMeasureAction,
} from "@/server/modules/moderation/actions";
import { Hidden } from "./action-button";
import { MEASURE_OPTIONS, PRIORITY_LABEL, PRIORITY_TARGET, RULE_REFS, type ActionKind, type Priority } from "./labels";

type CaseRef = { caseId: string; version: number };

/** S52/S53: Zuweisung durch die Moderationsleitung. */
export function AssignCaseForm({
  caseRef,
  current,
  people,
}: {
  caseRef: CaseRef;
  current: string | null;
  people: { id: string; label: string }[];
}) {
  const [state, action] = useActionState(assignCaseAction, idle);
  return (
    <form action={action} className="flex flex-col gap-4">
      <Hidden fields={caseRef} />
      <Field label="Zuständige Person" error={state.fieldErrors?.assigneeId} hint="Nur Personen mit aktiver Moderationsrolle und MFA.">
        {(p) => (
          <Select {...p} name="assigneeId" defaultValue={(state.values?.assigneeId as string) ?? current ?? ""}>
            <option value="" disabled>
              Bitte wählen
            </option>
            {people.map((x) => (
              <option key={x.id} value={x.id}>
                {x.label}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <FormMessage state={state} />
      <SubmitButton variant="secondary" pendingText="Wird zugewiesen …" className="self-start">
        Zuweisen
      </SubmitButton>
    </form>
  );
}

/** Triage bzw. Priorität ändern – Frist wird ab Eingang neu berechnet (Kapitel 10). */
export function PriorityForm({ caseRef, current, triage }: { caseRef: CaseRef; current: Priority; triage: boolean }) {
  const [state, action] = useActionState(setPriorityAction, idle);
  const [value, setValue] = useState<Priority>(current);
  return (
    <form action={action} className="flex flex-col gap-4">
      <Hidden fields={caseRef} />
      <Field label="Priorität" hint={PRIORITY_TARGET[value]}>
        {(p) => (
          <Select {...p} name="priority" value={value} onChange={(e) => setValue(e.target.value as Priority)}>
            {(Object.keys(PRIORITY_LABEL) as Priority[]).map((k) => (
              <option key={k} value={k}>
                {PRIORITY_LABEL[k]}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <FormMessage state={state} />
      <SubmitButton variant={triage ? "primary" : "secondary"} pendingText="Wird gespeichert …" className="self-start">
        {triage ? "Triage abschliessen" : "Priorität ändern"}
      </SubmitButton>
    </form>
  );
}

const DURATIONS_WRITE = [
  { value: "24", label: "24 Stunden" },
  { value: "72", label: "3 Tage" },
  { value: "168", label: "7 Tage" },
  { value: "336", label: "14 Tage (zweite Freigabe nötig)" },
  { value: "720", label: "30 Tage (zweite Freigabe nötig)" },
  { value: "0", label: "Unbefristet (zweite Freigabe nötig)" },
];
const DURATIONS_ACCOUNT = [
  { value: "168", label: "7 Tage" },
  { value: "720", label: "30 Tage" },
  { value: "0", label: "Unbefristet" },
];

/** SAF04: Massnahme mit Regelbezug, sicherer Begründung und interner Notiz. */
export function MeasureForm({
  caseRef,
  priority,
  canHide,
  hasSubject,
  notesOnly,
}: {
  caseRef: CaseRef;
  priority: Priority;
  canHide: boolean;
  hasSubject: boolean;
  /** Nur interne Notizen (z. B. eskalierter Fall ohne Leitungsrolle) */
  notesOnly: boolean;
}) {
  const [state, action] = useActionState(takeMeasureAction, idle);
  const fe = state.fieldErrors ?? {};
  const [kind, setKind] = useState<ActionKind | "">("");
  // Nach erfolgreichem Speichern setzt React das Formular zurück – Auswahl ebenfalls zurücksetzen.
  const [seen, setSeen] = useState(state);
  if (seen !== state) {
    setSeen(state);
    setKind(state.status === "success" ? "" : ((state.values?.kind as ActionKind) ?? ""));
  }
  const options = [
    ...(notesOnly ? [] : MEASURE_OPTIONS),
    { value: "note" as ActionKind, label: "Interne Notiz", description: "Beobachtung festhalten, ohne Wirkung für das Mitglied." },
  ].filter((o) => (o.value === "hide_content" ? canHide : true))
    .filter((o) => (o.value === "write_suspend" || o.value === "account_suspend" ? hasSubject : true));
  const heavy = kind === "hide_content" || kind === "write_suspend" || kind === "account_suspend";
  const needsReason = kind !== "" && kind !== "note" && kind !== "no_action";

  return (
    <form action={action} className="flex flex-col gap-6" onChange={(e) => {
      const t = e.target as HTMLInputElement;
      if (t.name === "kind") setKind(t.value as ActionKind);
    }}>
      <Hidden fields={caseRef} />
      <RadioCards name="kind" legend="Massnahme" options={options} defaultValue={kind || undefined} error={fe.kind} columns={2} required />

      {kind === "hide_content" && priority === "P0" && (
        <Notice tone="warning" title="Sofortiges Verbergen bei akuter Gefahr">
          Der Inhalt wird sofort ausgeblendet. Eine zweite zuständige Person prüft die Massnahme binnen 24 Betriebsstunden.
        </Notice>
      )}
      {kind === "account_suspend" && (
        <Notice tone="warning" title="Zweite Freigabe erforderlich">
          Die Kontosperre wird erst wirksam, wenn eine andere zuständige Person sie freigibt. Datenschutzrechte und Einspruch bleiben
          für das Mitglied erhalten. Eine Sperre ist keine Krisenreaktion (K02).
        </Notice>
      )}

      {kind !== "" && kind !== "note" && (
        <Field label="Regelbezug" required={needsReason} optional={!needsReason} error={fe.ruleRef}>
          {(p) => (
            <Select {...p} name="ruleRef" defaultValue={(state.values?.ruleRef as string) ?? ""}>
              <option value="">Bitte wählen</option>
              {RULE_REFS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
      )}

      {(kind === "write_suspend" || kind === "account_suspend") && (
        <Field label="Dauer" required error={fe.durationHours}>
          {(p) => (
            <Select {...p} name="durationHours" defaultValue={(state.values?.durationHours as string) ?? ""}>
              <option value="">Bitte wählen</option>
              {(kind === "write_suspend" ? DURATIONS_WRITE : DURATIONS_ACCOUNT).map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
      )}

      {needsReason && (
        <CountedTextarea
          label="Begründung für die betroffene Person"
          name="publicReason"
          maxLength={1000}
          rows={4}
          required
          error={fe.publicReason}
          defaultValue={(state.values?.publicReason as string) ?? ""}
          hint="Verständlich, mit Regel und Dauer. Nenne keine meldende Person und keine sensiblen Belege."
        />
      )}

      {kind !== "" && (
        <CountedTextarea
          label="Interne Notiz"
          name="internalNote"
          maxLength={2000}
          rows={3}
          required={kind === "note"}
          optional={kind !== "note"}
          error={fe.internalNote}
          defaultValue={(state.values?.internalNote as string) ?? ""}
          hint="Nur für zuständige Mitarbeitende sichtbar. Keine Gesundheitsdetails."
        />
      )}

      {heavy && (
        <Checkbox
          name="confirm"
          value="yes"
          label="Ich habe den Kontext geprüft. Die Massnahme ist verhältnismässig und begründet."
          error={fe.confirm}
        />
      )}

      <FormMessage state={state} />
      <SubmitButton pendingText="Wird festgehalten …" className="self-start" disabled={kind === ""}>
        {kind === "note" ? "Notiz speichern" : "Massnahme festhalten"}
      </SubmitButton>
    </form>
  );
}

/** Zweite Freigabe durch eine andere zuständige Person (SAF04). */
export function ReviewMeasureForm({ actionId, effectPending }: { actionId: string; effectPending: boolean }) {
  const [state, action] = useActionState(reviewMeasureAction, idle);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="actionId" value={actionId} />
      <Checkbox
        name="confirm"
        value="yes"
        label="Ich habe Belege, Begründung und Verhältnismässigkeit selbst geprüft."
        error={state.fieldErrors?.confirm}
      />
      <FormMessage state={state} />
      <div className="flex flex-wrap gap-2">
        <SubmitButton name="decision" value="approve" size="sm" pendingText="Wird gespeichert …">
          {effectPending ? "Freigeben und wirksam machen" : "Massnahme bestätigen"}
        </SubmitButton>
        <SubmitButton name="decision" value="reject" size="sm" variant="quiet-danger" pendingText="Wird gespeichert …">
          Nicht bestätigen
        </SubmitButton>
      </div>
    </form>
  );
}

/** Entscheid mit Regelbezug; Information an Betroffene, soweit Schutz oder Verfahren nicht gefährdet (SAF05). */
export function DecideCaseForm({ caseRef, hasSubject }: { caseRef: CaseRef; hasSubject: boolean }) {
  const [state, action] = useActionState(decideCaseAction, idle);
  const fe = state.fieldErrors ?? {};
  const [withhold, setWithhold] = useState(false);
  const [seen, setSeen] = useState(state);
  if (seen !== state) {
    setSeen(state);
    setWithhold(state.status !== "success" && state.values?.withhold === "yes");
  }
  return (
    <form action={action} className="flex flex-col gap-6">
      <Hidden fields={caseRef} />
      <CountedTextarea
        label="Entscheid für die betroffene Person"
        name="decisionSummary"
        maxLength={1500}
        rows={5}
        required
        error={fe.decisionSummary}
        defaultValue={(state.values?.decisionSummary as string) ?? ""}
        hint="Nennt Regelgrund, Massnahme und Dauer sowie den Einspruchsweg (30 Tage über «Meine Meldungen»). Keine Melderidentität, keine Belege."
      />
      <Field label="Regelbezug" optional error={fe.ruleRef}>
        {(p) => (
          <Select {...p} name="ruleRef" defaultValue={(state.values?.ruleRef as string) ?? ""}>
            <option value="">Kein Regelverstoss</option>
            {RULE_REFS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
        )}
      </Field>
      {hasSubject && (
        <div className="flex flex-col gap-4">
          <Checkbox
            name="withhold"
            value="yes"
            checked={withhold}
            onChange={(e) => setWithhold(e.target.checked)}
            label="Information an die betroffene Person zurückhalten"
            description="Nur wenn Schutz von Personen oder das Verfahren sonst gefährdet wären. Die Begründung wird intern festgehalten."
          />
          {withhold && (
            <CountedTextarea
              label="Begründung für das Zurückhalten"
              name="withholdReason"
              maxLength={500}
              rows={3}
              required
              error={fe.withholdReason}
              defaultValue={(state.values?.withholdReason as string) ?? ""}
            />
          )}
        </div>
      )}
      <FormMessage state={state} />
      <SubmitButton pendingText="Entscheid wird gespeichert …" className="self-start">
        Entscheid speichern
      </SubmitButton>
    </form>
  );
}
