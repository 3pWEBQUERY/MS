/**
 * Aufbewahrungsregeln aus PRD 11 «Lebenszyklus Aufbewahrung und Rechte» als reine Funktionen.
 * Es sind vorgeschlagene betriebliche Obergrenzen; die Freigabe erfolgt in D05.
 */

export const RETENTION = {
  /** Unbestätigte Konten (ACC02) */
  unverifiedDays: 7,
  /** Konto und Profil: Benachrichtigung nach 24 Monaten Inaktivität … */
  inactivityMonths: 24,
  /** … und Frist von 30 Tagen bis zur Löschung */
  inactivityGraceDays: 30,
  /** Gesundheitsdaten nach Widerruf (PRI02); Ausführung ab Tag 28 für sichere Einhaltung */
  healthAfterWithdrawalDays: 30,
  healthAfterWithdrawalRunFromDays: 28,
  /** Einwilligungsnachweise nach Ende der Nutzung */
  consentProofYears: 3,
} as const;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Kalendermonate abziehen (UTC), am Monatsende auf den letzten gültigen Tag begrenzt. */
export function subtractMonths(from: Date, months: number): Date {
  const d = new Date(from.getTime());
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - months);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d;
}

/** Wer zuletzt vor diesem Zeitpunkt aktiv war, erhält die Vorwarnung. */
export function inactivityCutoff(now: Date): Date {
  return subtractMonths(now, RETENTION.inactivityMonths);
}

/** Frühester Löschzeitpunkt nach der Vorwarnung. */
export function inactivityDeleteOn(noticeAt: Date): Date {
  return new Date(noticeAt.getTime() + RETENTION.inactivityGraceDays * DAY_MS);
}

/**
 * Ist ein Konto nach der Vorwarnung zu löschen? Nur wenn die Frist abgelaufen ist und seit
 * der Vorwarnung keine Aktivität (Anmeldung, Nutzung) stattfand.
 */
export function inactivityDue(input: { noticeAt: Date | null; lastActiveAt: Date | null; createdAt: Date }, now: Date): boolean {
  if (!input.noticeAt) return false;
  const lastActive = input.lastActiveAt ?? input.createdAt;
  if (lastActive.getTime() > input.noticeAt.getTime()) return false;
  return inactivityDeleteOn(input.noticeAt).getTime() <= now.getTime();
}

/** Spätester Löschtermin für Gesundheitsdaten nach Widerruf (Anzeige in S12). */
export function healthDeleteBy(withdrawnAt: Date): Date {
  return new Date(withdrawnAt.getTime() + RETENTION.healthAfterWithdrawalDays * DAY_MS);
}
