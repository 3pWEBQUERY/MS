import Link from "next/link";
import { Notice } from "@/components/ui/primitives";
import type { FlagKey } from "@/server/flags";

/** Für Mitglieder relevante Einschränkungen im Teilbetrieb (HOM08), in Alltagssprache. */
const MEMBER_FLAGS: { key: FlagKey; text: string }[] = [
  { key: "health_write", text: "Neue Check-ins und Tagebucheinträge speichern" },
  { key: "community_write", text: "Beiträge und Antworten in der Community schreiben" },
  { key: "chat", text: "Kontaktanfragen und Nachrichten senden" },
];

/**
 * S61 auf «Heute» (HOM08): erklärt, welche Funktionen gerade pausiert sind. Bestehende Daten
 * bleiben lesbar, Wissen, Hilfe und die Sicherheitsseite bleiben erreichbar.
 */
export function PartialOperationNotice({ flags }: { flags: Record<FlagKey, boolean> }) {
  const off = MEMBER_FLAGS.filter((f) => !flags[f.key]);
  if (off.length === 0) return null;
  return (
    <Notice tone="warning" title="Einige Funktionen sind gerade pausiert">
      <p>Vorübergehend nicht möglich:</p>
      <ul className="mt-1 flex list-disc flex-col gap-0.5 pl-5">
        {off.map((f) => (
          <li key={f.key}>{f.text}</li>
        ))}
      </ul>
      <p className="mt-2">
        Deine bestehenden Inhalte bleiben erhalten und lesbar. Wissen, Hilfe und{" "}
        <Link href="/sicherheit">Sicherheit und akute Hilfe</Link> sind weiterhin erreichbar.
      </p>
    </Notice>
  );
}
