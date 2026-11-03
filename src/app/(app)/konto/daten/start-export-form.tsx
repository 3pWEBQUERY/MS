"use client";

import Link from "next/link";
import { FormMessage, OperationId, SubmitButton } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { startExportAction } from "@/server/modules/privacy/actions";
import { useResilientAction } from "@/components/ui/use-resilient-action";

/** Export starten (PRI03): idempotent über die Vorgangskennung, Erfolg erst nach Serverbestätigung. */
export function StartExportForm({ disabled }: { disabled?: boolean }) {
  const [state, action] = useResilientAction(startExportAction);
  return (
    <form action={action} className="flex flex-col items-start gap-3">
      <OperationId />
      <SubmitButton size="lg" disabled={disabled} pendingText="Export wird angelegt …" icon={<Icon name="download" className="size-5" />}>
        Export erstellen
      </SubmitButton>
      <FormMessage state={state} className="w-full max-w-2xl" />
      {state.data?.auth === "reauth" && (
        <Link href="/konto/bestaetigen?next=%2Fkonto%2Fdaten" className="text-base font-medium text-ink underline underline-offset-4">
          Jetzt mit Passwort bestätigen
        </Link>
      )}
    </form>
  );
}
