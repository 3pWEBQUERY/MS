import Link from "next/link";
import { Notice } from "@/components/ui/primitives";

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

/** Kurzer Hinweis zu Sichtbarkeit (PRD 05 «Kein Übertragen in die Community»). */
export function PrivacyHint() {
  return (
    <p className="text-sm text-ink-2">
      Nur du siehst diese Einträge. Es gibt keine Teilen-Funktion und keine automatische Auswertung.
    </p>
  );
}
