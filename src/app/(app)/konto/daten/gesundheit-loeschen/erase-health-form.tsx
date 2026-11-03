"use client";

import { Checkbox, FormMessage, SubmitButton } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { eraseHealthAction } from "@/server/modules/privacy/actions";
import { useResilientAction } from "@/components/ui/use-resilient-action";

/** PRI04: separate, ausdrücklich bestätigte Inhaltsauswahl. */
export function EraseHealthForm() {
  const [state, action] = useResilientAction(eraseHealthAction);
  return (
    <form action={action} noValidate className="flex flex-col gap-5 rounded-[20px] border border-danger/40 bg-surface p-5 sm:p-6">
      <FormMessage state={state} />
      <Checkbox
        name="confirm"
        label="Ich möchte alle oben aufgeführten Gesundheitsdaten endgültig löschen."
        description="Mein Community-Konto, meine Beiträge und Gespräche bleiben bestehen."
        error={state.fieldErrors?.confirm}
      />
      <div>
        <SubmitButton variant="danger" size="lg" pendingText="Wird gelöscht …" icon={<Icon name="trash" className="size-5" />}>
          Gesundheitsdaten löschen
        </SubmitButton>
      </div>
    </form>
  );
}
