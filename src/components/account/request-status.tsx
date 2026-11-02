import { Badge, type Tone } from "@/components/ui/primitives";

/** Status eines Datenschutzauftrags mit Text (nie nur Farbe). */
const LABEL: Record<string, string> = {
  requested: "Angefordert",
  deactivated: "Deaktiviert",
  in_progress: "In Bearbeitung",
  verified: "Geprüft",
  completed: "Abgeschlossen",
  failed: "Fehler – wird geprüft",
  rejected: "Abgelehnt",
};

const TONE: Record<string, Tone> = {
  requested: "info",
  deactivated: "warning",
  in_progress: "info",
  verified: "info",
  completed: "success",
  failed: "danger",
  rejected: "neutral",
};

export function RequestStatusBadge({ status }: { status: string }) {
  return <Badge tone={TONE[status] ?? "neutral"}>{LABEL[status] ?? status}</Badge>;
}

const TASK_LABEL: Record<string, { label: string; tone: Tone }> = {
  pending: { label: "Ausstehend", tone: "neutral" },
  done: { label: "Erledigt", tone: "success" },
  failed: { label: "Fehlgeschlagen – wird wiederholt", tone: "warning" },
  escalated: { label: "Eskaliert", tone: "danger" },
};

export function TaskStatusBadge({ status }: { status: string }) {
  const s = TASK_LABEL[status] ?? TASK_LABEL.pending;
  return (
    <Badge tone={s.tone} icon={status === "done" ? "check" : status === "escalated" ? "alert" : undefined}>
      {s.label}
    </Badge>
  );
}
