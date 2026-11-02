import { Badge, type Tone } from "@/components/ui/primitives";
import type { IconName } from "@/components/ui/icon";

/** Exportstatus mit Text und Icon, nie nur Farbe (DESIGN 5, S17). */
export const EXPORT_STATUS: Record<string, { label: string; tone: Tone; icon: IconName }> = {
  queued: { label: "In Warteschlange", tone: "neutral", icon: "hourglass" },
  running: { label: "Wird erstellt", tone: "info", icon: "loader" },
  ready: { label: "Bereit zum Herunterladen", tone: "success", icon: "check-circle" },
  expired: { label: "Abgelaufen", tone: "outline", icon: "clock" },
  failed: { label: "Fehlgeschlagen", tone: "danger", icon: "alert" },
};

export const EXPORT_ERROR: Record<string, string> = {
  storage_not_configured:
    "Exportablage nicht konfiguriert: Die sichere Ablage für Exportdateien ist im Moment nicht eingerichtet. Es wurde nichts gespeichert. Bitte versuche es später erneut oder wende dich an die Datenschutzstelle.",
  superseded_by_erasure: "Abgebrochen, weil du deine Gesundheitsdaten gelöscht hast. Du kannst einen neuen Export starten.",
  account_deleted: "Abgebrochen wegen Kontolöschung.",
  account_inactive: "Abgebrochen, weil das Konto nicht mehr aktiv ist.",
  generation_failed: "Der Export konnte nach mehreren Versuchen nicht erstellt werden. Bitte starte einen neuen Export.",
  timeout: "Der Export hat zu lange gedauert. Bitte starte einen neuen Export.",
};

export function ExportStatusBadge({ status }: { status: string }) {
  const s = EXPORT_STATUS[status] ?? EXPORT_STATUS.queued;
  return (
    <Badge tone={s.tone} icon={s.icon}>
      {s.label}
    </Badge>
  );
}
