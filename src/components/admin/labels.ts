import type { Tone } from "@/components/ui/primitives";

/**
 * Clientsichere Beschriftungen und Regeln für den Verwaltungsbereich (PRD 03, PRD 10).
 * Keine Daten, nur Kataloge.
 */
export type StaffRoleKey =
  | "moderator"
  | "moderation_lead"
  | "editor"
  | "medical_reviewer"
  | "admin"
  | "ops"
  | "privacy_officer";

export const ROLE_LABEL: Record<StaffRoleKey, string> = {
  moderator: "Moderation",
  moderation_lead: "Moderationsleitung",
  editor: "Redaktion",
  medical_reviewer: "Medizinische Prüfung",
  admin: "Administration",
  ops: "Technischer Betrieb",
  privacy_officer: "Datenschutzstelle",
};

export const ROLE_KEYS = Object.keys(ROLE_LABEL) as StaffRoleKey[];

/* ───────────── Moderation ───────────── */
export type CaseStatus = "new" | "triaged" | "in_progress" | "escalated" | "decided" | "appeal" | "closed";
export type Priority = "P0" | "P1" | "P2" | "P3";

export const CASE_STATUS_LABEL: Record<CaseStatus, string> = {
  new: "Neu",
  triaged: "Triagiert",
  in_progress: "In Bearbeitung",
  escalated: "Eskaliert",
  decided: "Entschieden",
  appeal: "Einspruch",
  closed: "Abgeschlossen",
};

export const CASE_STATUS_TONE: Record<CaseStatus, Tone> = {
  new: "info",
  triaged: "neutral",
  in_progress: "neutral",
  escalated: "warning",
  decided: "success",
  appeal: "accent",
  closed: "outline",
};

/** SAF03: Zustandsautomat – jede Änderung braucht einen gültigen Vorgängerzustand. */
export const CASE_TRANSITIONS: Record<CaseStatus, CaseStatus[]> = {
  new: ["triaged", "in_progress", "escalated"],
  triaged: ["in_progress", "escalated"],
  in_progress: ["escalated"],
  escalated: ["in_progress"],
  // «entschieden» entsteht nur über den begründeten Entscheid, «Einspruch» über den Einspruch des Mitglieds
  decided: ["closed"],
  appeal: [],
  closed: [],
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  P0: "P0 Akute Gefahr",
  P1: "P1 Hoher Schaden",
  P2: "P2 Regelverstoss",
  P3: "P3 Qualität",
};

export const PRIORITY_TONE: Record<Priority, Tone> = {
  P0: "danger",
  P1: "warning",
  P2: "info",
  P3: "neutral",
};

/** Kapitel 10: vorgeschlagene Reaktionsziele (Serviceziele, keine 24/7-Zusage). */
export const PRIORITY_TARGET: Record<Priority, string> = {
  P0: "Prüfung binnen 30 Minuten während Betriebszeit",
  P1: "Triage binnen 2 Betriebsstunden, Entscheid möglichst am selben Betriebstag",
  P2: "Triage binnen 1 Betriebstag",
  P3: "Bearbeitung binnen 3 Betriebstagen",
};

export const OPERATING_HOURS_NOTE = "Betriebszeit täglich 09–18 Uhr (Europe/Zurich). Fristen zählen nur Betriebszeit; Eingänge ausserhalb beginnen mit dem nächsten Dienstbeginn.";

export const REPORT_REASON_LABEL: Record<string, string> = {
  harassment: "Belästigung",
  privacy: "Datenschutz",
  dangerous_medical: "Gefährliche medizinische Behauptung",
  spam_fraud: "Spam oder Betrug",
  acute_danger: "Akute Gefahr",
  other: "Sonstiges",
};

export const TARGET_LABEL: Record<string, string> = {
  post: "Beitrag",
  comment: "Antwort",
  profile: "Profil",
  message: "Nachricht",
  group: "Gruppe",
};

export type ActionKind =
  | "note"
  | "warn"
  | "hide_content"
  | "request_edit"
  | "write_suspend"
  | "account_suspend"
  | "restore"
  | "no_action";

export const ACTION_LABEL: Record<ActionKind, string> = {
  note: "Interne Notiz",
  warn: "Hinweis oder Verwarnung",
  hide_content: "Inhalt ausblenden",
  request_edit: "Textüberarbeitung anfordern",
  write_suspend: "Zeitweise Schreibsperre",
  account_suspend: "Kontosperre",
  restore: "Wiederherstellung",
  no_action: "Keine Massnahme",
};

/** Massnahmen, die im Fall gewählt werden können (SAF04, Kapitel 10 «Verhältnismässiger Ablauf»). */
export const MEASURE_OPTIONS: { value: ActionKind; label: string; description: string }[] = [
  { value: "warn", label: "Hinweis oder Verwarnung", description: "Mitglied erhält einen Hinweis mit Regelbezug." },
  { value: "request_edit", label: "Textüberarbeitung anfordern", description: "Inhalt bleibt sichtbar, Mitglied wird um Anpassung gebeten." },
  { value: "hide_content", label: "Inhalt ausblenden", description: "Nur für Beiträge und Antworten. Bei P0 sofort möglich, Zweitprüfung binnen 24 Betriebsstunden." },
  { value: "write_suspend", label: "Zeitweise Schreibsperre", description: "Bis 7 Tage sofort wirksam. Länger oder unbefristet nur mit zweiter Freigabe." },
  { value: "account_suspend", label: "Eskalation zur Kontosperre", description: "Wird erst nach zweiter Freigabe durch eine andere zuständige Person wirksam." },
  { value: "no_action", label: "Keine Massnahme", description: "Kein Regelverstoss festgestellt." },
];

/** Regelbezüge aus den Community-Regeln (SAF07). */
export const RULE_REFS: { value: string; label: string }[] = [
  { value: "R1 Respekt", label: "R1 Respektvoller Umgang, keine Belästigung" },
  { value: "R2 Privatsphäre", label: "R2 Privatsphäre, kein Doxxing" },
  { value: "R3 Medizin", label: "R3 Keine gefährlichen individuellen Therapieanweisungen" },
  { value: "R4 Werbung", label: "R4 Keine Werbung ohne Freigabe, kein Betrug" },
  { value: "R5 Thema", label: "R5 Passendes Thema und verständliche Formulierung" },
  { value: "R6 Sicherheit", label: "R6 Sicherheit und Schutz von Personen" },
];

export const APPEAL_STATUS_LABEL: Record<string, string> = {
  open: "Offen",
  in_review: "In Prüfung",
  upheld: "Bestätigt",
  overturned: "Aufgehoben",
};

export const APPEAL_STATUS_TONE: Record<string, Tone> = {
  open: "info",
  in_review: "neutral",
  upheld: "outline",
  overturned: "success",
};

/* ───────────── Konten ───────────── */
export const ACCOUNT_STATUS_LABEL: Record<string, string> = {
  unverified: "Unbestätigt",
  active: "Aktiv",
  restricted: "Eingeschränkt",
  suspended: "Gesperrt",
  deletion_pending: "Löschung ausstehend",
  deleted: "Gelöscht",
};

export const ACCOUNT_STATUS_TONE: Record<string, Tone> = {
  unverified: "neutral",
  active: "success",
  restricted: "warning",
  suspended: "danger",
  deletion_pending: "outline",
  deleted: "outline",
};

/** Kontrollierte Begründungen (keine Freitexte im Audit, PRI07). */
export const STATUS_REASONS: { value: string; label: string }[] = [
  { value: "moderation_case", label: "Folge eines Moderationsfalls" },
  { value: "security", label: "Sicherheitsvorfall oder Kontoübernahme-Verdacht" },
  { value: "member_request", label: "Auf Wunsch des Mitglieds" },
  { value: "appeal_result", label: "Ergebnis eines Einspruchs" },
  { value: "correction", label: "Korrektur einer fehlerhaften Änderung" },
];

export const SANCTION_LABEL: Record<string, string> = {
  write_suspend: "Schreibsperre",
  account_suspend: "Kontosperre",
};

/* ───────────── Betrieb ───────────── */
export const FLAG_LABEL: Record<string, string> = {
  community_write: "Community-Schreiben",
  chat: "Kontaktanfragen und Chat",
  health_write: "Gesundheits-Schreiben",
  registration: "Registrierung",
  registration_invite_only: "Nur mit Einladungscode",
};

export const INCIDENT_STEPS: { value: string; label: string; description: string }[] = [
  { value: "I01", label: "I01 Eindämmen", description: "Betroffene Zugriffe stoppen, Schlüssel oder Sitzungen widerrufen, technische Belege erhalten." },
  { value: "I02", label: "I02 Bewerten", description: "Leitung, Sicherheit und Datenschutzkontakt bewerten Daten, Reichweite, Folgen und Pflichten." },
  { value: "I03", label: "I03 Informieren", description: "Entscheid über Behörden- und Betroffeneninformation; Zeitpunkt und Begründung festhalten." },
  { value: "I04", label: "I04 Wiederherstellen", description: "Ursache beseitigen, Zugriff testen, Wiederaufnahme freigeben, Nachbesprechung binnen 5 Betriebstagen." },
];

export const SPECIAL_ACCESS_SCOPES: { value: string; label: string }[] = [
  { value: "db_metadata_read", label: "Datenbank: technische Metadaten lesen" },
  { value: "db_case_evidence", label: "Datenbank: Belege eines bestimmten Falls" },
  { value: "db_account_record", label: "Datenbank: Kontodatensatz eines bestimmten Kontos" },
  { value: "storage_object", label: "Objektablage: bestimmtes Objekt" },
  { value: "logs_extended", label: "Erweiterte technische Protokolle" },
];

export const GRANT_STATUS_LABEL: Record<string, string> = {
  requested: "Beantragt",
  approved: "Aktiv",
  rejected: "Abgelehnt",
  expired: "Abgelaufen",
  revoked: "Widerrufen",
};

export const GRANT_STATUS_TONE: Record<string, Tone> = {
  requested: "info",
  approved: "warning",
  rejected: "outline",
  expired: "outline",
  revoked: "outline",
};
