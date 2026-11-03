import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { Notice } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";

/** Gesundheitsbereich abgelehnt oder widerrufen (US10, PRD 05 «Besondere Formularzustände»). */
export function HealthInactiveNotice({ hasData }: { hasData: boolean }) {
  return hasData ? (
    <Notice tone="neutral" title="Der Gesundheitsbereich ist nicht aktiv">
      <p>
        Neue Einträge und Änderungen sind gesperrt. Deine bestehenden Einträge kannst du weiterhin ansehen,{" "}
        <Link href="/konto/daten">exportieren oder löschen</Link>. Aktivieren kannst du den Bereich jederzeit unter{" "}
        <Link href="/konto/privatsphaere">Privatsphäre</Link>.
      </p>
    </Notice>
  ) : (
    <Notice tone="neutral" title="Du hast den Gesundheitsbereich nicht aktiviert">
      <p>
        Das ist völlig in Ordnung. Community, Wissen und Hilfe stehen dir vollständig zur Verfügung. Falls du später etwas
        festhalten möchtest, kannst du den Bereich unter <Link href="/konto/privatsphaere">Privatsphäre</Link> aktivieren.
      </p>
    </Notice>
  );
}

/** Bestätigung nach S08 (erst nach Serverbestätigung, HOM07). */
export function ActivatedNotice() {
  return (
    <Notice tone="success" role="status" title="Der Gesundheitsbereich ist aktiviert">
      Nur du siehst deine Einträge. Du kannst die Einwilligung jederzeit unter{" "}
      <Link href="/konto/privatsphaere">Privatsphäre</Link> widerrufen.
    </Notice>
  );
}

/** Teilbetrieb (HOM08): Gesundheits-Schreiben abgeschaltet, Lesen bleibt möglich. */
export function WriteDisabledNotice() {
  return (
    <Notice tone="warning" title="Neue Einträge sind vorübergehend nicht möglich" role="status">
      <p>
        Wir haben das Speichern neuer Check-ins und Tagebucheinträge kurz pausiert. Deine bestehenden Einträge bleiben
        erhalten und lesbar. Bitte versuche es später noch einmal.
      </p>
    </Notice>
  );
}

/**
 * Kurzer Hinweis zu Sichtbarkeit (PRD 05 «Kein Übertragen in die Community»).
 * `onDeep` für die tiefe Fläche (nur on-deep-Tokens, docs/DESIGN.md).
 */
export function PrivacyHint({ onDeep = false, className }: { onDeep?: boolean; className?: string }) {
  return (
    <p className={cn("flex items-start gap-2.5 text-sm", onDeep ? "text-on-deep-2" : "text-ink-2", className)}>
      <Icon name="lock" className={cn("mt-0.5 size-4 shrink-0", onDeep ? "text-deep-accent" : "text-ink-3")} />
      <span>Nur du siehst diese Einträge. Es gibt keine Teilen-Funktion und keine automatische Auswertung.</span>
    </p>
  );
}
