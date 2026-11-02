import { Notice } from "@/components/ui/primitives";

/**
 * Bestätigung nach Serveraktion mit Weiterleitung (Erfolg erst nach Serverbestätigung, PRD 04).
 * Nur feste Codes in der URL – keine Inhalte oder Personenangaben.
 */
const MESSAGES: Record<string, { title: string; text?: string }> = {
  abgelehnt: { title: "Anfrage abgelehnt.", text: "Die andere Person sieht nur, dass die Anfrage nicht aktiv ist." },
  zurueckgezogen: { title: "Anfrage zurückgezogen." },
  beendet: { title: "Kontakt beendet.", text: "Der bisherige Verlauf bleibt lesbar. Neue Nachrichten sind nicht mehr möglich." },
  verbunden: { title: "Kontakt angenommen.", text: "Ihr könnt einander jetzt schreiben." },
  blockiert: {
    title: "Person blockiert.",
    text: "Kontakt, Anfragen und Nachrichten sind in beide Richtungen gesperrt. Melden bleibt jederzeit möglich.",
  },
  aufgehoben: { title: "Blockierung aufgehoben.", text: "Ein Kontakt wird dadurch nicht wiederhergestellt." },
  einspruch: {
    title: "Einspruch eingereicht.",
    text: "Eine andere zuständige Person prüft die Entscheidung. Den Stand siehst du hier.",
  },
};

export function StatusNotice({ code }: { code: string | string[] | undefined }) {
  const key = typeof code === "string" ? code : undefined;
  const m = key ? MESSAGES[key] : undefined;
  if (!m) return null;
  return (
    <Notice tone="success" role="status" title={m.title}>
      {m.text}
    </Notice>
  );
}
