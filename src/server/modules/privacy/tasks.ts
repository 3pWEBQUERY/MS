/**
 * Teilschritte von Löschaufträgen (PRI06, PRD 11 «Löschung über Systeme»):
 * Datenbank, Suchindex, Objektablage, Cache, Warteschlangen und Dienstleister.
 * Die Reihenfolge ist zugleich die Ausführungsreihenfolge im Worker.
 */
export type TaskDef = { system: string; objectClass: string; label: string };

export const ACCOUNT_TASKS: TaskDef[] = [
  { system: "database", objectClass: "community_texts", label: "Beiträge und Antworten" },
  { system: "database", objectClass: "messages", label: "Nachrichten und Gesprächsverknüpfungen" },
  { system: "database", objectClass: "health", label: "Check-ins, Tagebuch, Symptome" },
  { system: "object_storage", objectClass: "exports", label: "Exportdateien" },
  { system: "database", objectClass: "profile_settings", label: "Profil, Einstellungen, Merkliste, Sitzungen" },
  { system: "queues", objectClass: "outbox_delivery", label: "Warteschlangen und Zustellaufträge" },
  { system: "search_index", objectClass: "fulltext", label: "Suchindex" },
  { system: "cache", objectClass: "server_cache", label: "Zwischenspeicher" },
  { system: "vendors", objectClass: "mail_provider", label: "Auftragsbearbeiter (E-Mail-Versand)" },
  { system: "database", objectClass: "account_record", label: "Kontodatensatz und Abschlussbeleg" },
];

export const HEALTH_TASKS: TaskDef[] = [
  { system: "database", objectClass: "health", label: "Check-ins, Tagebuch, Symptome, eigene Bezeichnungen" },
  { system: "queues", objectClass: "export_jobs", label: "Laufende Exportaufträge" },
  { system: "object_storage", objectClass: "exports", label: "Exportdateien" },
  { system: "search_index", objectClass: "fulltext", label: "Suchindex" },
  { system: "cache", objectClass: "server_cache", label: "Zwischenspeicher" },
];

export const SYSTEM_LABEL: Record<string, string> = {
  database: "Datenbank",
  object_storage: "Objektablage",
  search_index: "Suchindex",
  cache: "Cache",
  queues: "Warteschlangen",
  vendors: "Dienstleister",
};

export const taskKey = (t: { system: string; objectClass: string }) => `${t.system}:${t.objectClass}`;

export function taskOrder(type: string, t: { system: string; objectClass: string }): number {
  const list = type === "erasure_health" ? HEALTH_TASKS : ACCOUNT_TASKS;
  const i = list.findIndex((d) => taskKey(d) === taskKey(t));
  return i === -1 ? 99 : i;
}

export function taskLabel(type: string, t: { system: string; objectClass: string }): string {
  const list = type === "erasure_health" ? HEALTH_TASKS : ACCOUNT_TASKS;
  return list.find((d) => taskKey(d) === taskKey(t))?.label ?? t.objectClass;
}

/** Nach so vielen Fehlversuchen wird ein Teilschritt eskaliert – nie stiller Abschluss. */
export const ESCALATE_AFTER = 5;

export const NOT_APPLICABLE = {
  search_index:
    "Kein separater Suchdienst: der PostgreSQL-Volltextindex ist aus den Datenzeilen abgeleitet und wird mit ihnen bereinigt.",
  cache: "Keine personenbezogenen Daten in gemeinsamen Caches – gecacht werden nur öffentliche Inhalte.",
};

/**
 * Beleg für den Teilschritt «Auftragsbearbeiter (E-Mail-Versand)». Nennt den tatsächlichen Stand
 * statt einen Vertrag zu behaupten, der noch nicht existiert (Auftragsbearbeiterliste, D04).
 */
export function vendorReceipt(smtpHost = process.env.SMTP_HOST ?? ""): string {
  if (!smtpHost) return "Kein E-Mail-Dienstleister angebunden: dort liegen keine Daten zu diesem Konto.";
  return "E-Mail-Versand über einen externen Dienstleister: Die Plattform übergibt nur Empfängeradresse und Text der Konto-E-Mails. Versandprotokolle beim Dienstleister werden nach dessen Vertrag gelöscht (siehe docs/compliance/auftragsbearbeiter.md).";
}
