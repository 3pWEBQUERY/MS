"use client";

import { useActionState } from "react";
import { Checkbox, CountedTextarea, Field, FormMessage, RadioCards, Select, SubmitButton } from "@/components/ui/form";
import { idle } from "@/lib/action-state";
import { assignAppealAction, decideAppealAction } from "@/server/modules/moderation/appeal-actions";

/** Zuweisung an eine andere Person als die Entscheidende (SAF05, AT07). */
export function AssignAppealForm({
  appealId,
  current,
  people,
}: {
  appealId: string;
  current: string | null;
  people: { id: string; label: string }[];
}) {
  const [state, action] = useActionState(assignAppealAction, idle);
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="appealId" value={appealId} />
      <Field
        label="Prüfende Person"
        error={state.fieldErrors?.reviewerId}
        hint="Zur Auswahl stehen nur Personen, die am Entscheid nicht beteiligt waren."
      >
        {(p) => (
          <Select {...p} name="reviewerId" defaultValue={(state.values?.reviewerId as string) ?? current ?? ""}>
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
      <SubmitButton variant="secondary" pendingText="Wird zugewiesen …" className="self-start" disabled={people.length === 0}>
        Zur Prüfung zuweisen
      </SubmitButton>
    </form>
  );
}

/** Unabhängige Prüfung: bestätigen oder aufheben; Ergebnis geht an die einspruchführende Person. */
export function DecideAppealForm({ appealId }: { appealId: string }) {
  const [state, action] = useActionState(decideAppealAction, idle);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="appealId" value={appealId} />
      <RadioCards
        name="outcome"
        legend="Ergebnis der Prüfung"
        required
        error={fe.outcome}
        defaultValue={(state.values?.outcome as string) ?? undefined}
        columns={2}
        options={[
          { value: "upheld", label: "Entscheid bestätigen", description: "Die Massnahme bleibt bestehen. Der Fall wird abgeschlossen." },
          {
            value: "overturned",
            label: "Entscheid aufheben",
            description: "Sanktionen werden aufgehoben, ausgeblendete Inhalte wiederhergestellt.",
          },
        ]}
      />
      <CountedTextarea
        label="Begründung für die einspruchführende Person"
        name="decisionNote"
        maxLength={1500}
        rows={5}
        required
        error={fe.decisionNote}
        defaultValue={(state.values?.decisionNote as string) ?? ""}
        hint="Verständlich und mit Regelbezug. Keine Melderidentität und keine sensiblen Belege."
      />
      <Checkbox
        name="confirm"
        value="yes"
        label="Ich war am ursprünglichen Entscheid nicht beteiligt und habe den Fall unabhängig geprüft."
        error={fe.confirm}
      />
      <FormMessage state={state} />
      <SubmitButton pendingText="Ergebnis wird gespeichert …" className="self-start">
        Ergebnis speichern
      </SubmitButton>
    </form>
  );
}
