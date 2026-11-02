import Link from "next/link";
import { Notice } from "@/components/ui/primitives";

/**
 * COM04: In jeder Diskussion sind Regeln, Melden und der Hinweis auf Grenzen erreichbar.
 * Community-Inhalte sind persönliche Erfahrungen – getrennt von geprüftem Wissen.
 */
export function BoundaryNotice({ compact = false }: { compact?: boolean }) {
  return (
    <Notice tone="neutral" icon="info" title="Persönliche Erfahrung, keine medizinische Beratung">
      {compact ? (
        <p>
          Hier teilen Mitglieder eigene Erfahrungen. Fragen zu deiner Behandlung klärst du mit deiner Fachperson.{" "}
          <Link href="/regeln">Regeln</Link> · <Link href="/sicherheit">Sicherheit und Notfall</Link>
        </p>
      ) : (
        <>
          <p>
            Beiträge geben Erfahrungen von Mitgliedern wieder und wurden nicht fachlich geprüft. Fragen zu deiner
            Behandlung klärst du am besten mit deiner Fachperson. Bei akuter Gefahr findest du Hilfe unter{" "}
            <Link href="/sicherheit">Sicherheit und Notfall</Link>.
          </p>
          <p className="mt-1">
            Es gelten die <Link href="/regeln">Community-Regeln</Link>. Wenn dir etwas nicht richtig vorkommt, nutze
            «Melden» beim jeweiligen Inhalt.
          </p>
        </>
      )}
    </Notice>
  );
}
