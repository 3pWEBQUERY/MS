"use client";

import { useActionState, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Checkbox, Field, FormMessage, Input, Select, SubmitButton } from "@/components/ui/form";
import { idle } from "@/lib/action-state";
import { changeAccountStatusAction, liftSanctionAction } from "@/server/modules/admin/member-actions";
import { ACCOUNT_STATUS_LABEL, STATUS_REASONS } from "./labels";

const TARGETS = ["active", "restricted", "suspended"] as const;

/** Kontostatus ändern (ACC08) – mit Begründungscode, Ticket und Bestätigung. */
export function AccountStatusForm({ accountId, version, current }: { accountId: string; version: number; current: string }) {
  const [state, action] = useActionState(changeAccountStatusAction, idle);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="accountId" value={accountId} />
      <input type="hidden" name="version" value={version} />
      <Field label="Neuer Status" required error={fe.status}>
        {(p) => (
          <Select {...p} name="status" defaultValue={(state.values?.status as string) ?? ""}>
            <option value="">Bitte wählen</option>
            {TARGETS.filter((t) => t !== current).map((t) => (
              <option key={t} value={t}>
                {ACCOUNT_STATUS_LABEL[t]}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="Begründung" required error={fe.reason}>
        {(p) => (
          <Select {...p} name="reason" defaultValue={(state.values?.reason as string) ?? ""}>
            <option value="">Bitte wählen</option>
            {STATUS_REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="Ticket oder Fallnummer" optional hint="Zum Beispiel OPS-1234 oder eine Fallnummer. Keine Freitexte.">
        {(p) => <Input {...p} name="ticket" maxLength={60} defaultValue={(state.values?.ticket as string) ?? ""} />}
      </Field>
      <Checkbox
        name="confirm"
        value="yes"
        error={fe.confirm}
        label="Ich bestätige die Änderung."
        description="Gesperrte Konten behalten Zugang zu Auskunft, Export, Löschung und Einspruch."
      />
      <FormMessage state={state} />
      <SubmitButton pendingText="Wird geändert …" className="self-start">
        Status ändern
      </SubmitButton>
    </form>
  );
}

/** Sanktion aufheben – mit Bestätigungsdialog. */
export function LiftSanctionForm({ sanctionId }: { sanctionId: string }) {
  const [state, action] = useActionState(liftSanctionAction, idle);
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const close = () => {
    setOpen(false);
    requestAnimationFrame(() => trigger.current?.focus());
  };
  return (
    <form action={action} onSubmit={close}>
      <input type="hidden" name="sanctionId" value={sanctionId} />
      <div className="flex flex-col items-start gap-2">
        <Button ref={trigger} type="button" size="sm" variant="secondary" onClick={() => setOpen(true)}>
          Aufheben
        </Button>
        <FormMessage state={state} />
      </div>
      {open && (
        <Dialog open={open} onClose={close} title="Sanktion aufheben?" description="Die Sanktion endet sofort. Die Aufhebung wird protokolliert.">
          <Field label="Begründung" required error={state.fieldErrors?.reason}>
            {(p) => (
              <Select {...p} name="reason" defaultValue="">
                <option value="">Bitte wählen</option>
                {STATUS_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Ticket oder Fallnummer" optional>
            {(p) => <Input {...p} name="ticket" maxLength={60} />}
          </Field>
          <div className="flex flex-wrap gap-2">
            <SubmitButton pendingText="Wird aufgehoben …">Sanktion aufheben</SubmitButton>
            <Button type="button" variant="ghost" onClick={close}>
              Abbrechen
            </Button>
          </div>
        </Dialog>
      )}
    </form>
  );
}
