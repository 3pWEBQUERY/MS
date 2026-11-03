import "server-only";
import { sql as dsql } from "drizzle-orm";
import { after } from "next/server";
import { analyticsDedupeKey, ANALYTICS_RETENTION_DAYS, parseAnalyticsEvent, type AnalyticsEvent, type CoreFlow } from "@/lib/analytics";
import { ANALYTICS_CONSENT_VERSION } from "@/lib/catalog";
import { redactLogText } from "@/lib/log-safety";
import { localDateString } from "@/lib/time";
import { db } from "../../db";

/**
 * Optionale Produktanalytics (PRD 15). Jede Erfassung prüft zuerst die aktuelle Einwilligung
 * «analytics» (eigener Zweck, nie vorausgewählt, PRI01). Ohne gültige Einwilligung wird nichts
 * gespeichert – auch kein Bezug. Fehler verändern nie die fachliche Antwort.
 */

/** Gilt die Einwilligung in der aktuellen Textfassung, und ist das Konto aktiv? */
export async function hasAnalyticsConsent(accountId: string): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/i.test(accountId)) return false;
  const rows = (await db.execute(dsql`
    select c.decision, c.text_version
    from identity.consent_records c
    join identity.accounts a on a.id = c.account_id
    where c.account_id = ${accountId} and c.purpose = 'analytics' and a.status in ('active', 'restricted')
    order by c.decided_at desc
    limit 1`)) as unknown as { decision: string; text_version: string }[];
  const latest = rows[0];
  return latest?.decision === "granted" && latest.text_version === ANALYTICS_CONSENT_VERSION;
}

/** Bestehenden, gültigen Bezug verwenden oder einen neuen zufälligen anlegen (≤ 30 Tage). */
async function subjectRef(accountId: string): Promise<string | null> {
  return db.transaction(async (tx) => {
    await tx.execute(dsql`delete from analytics.subjects where account_id = ${accountId} and expires_at <= now()`);
    await tx.execute(dsql`
      insert into analytics.subjects (account_id, expires_at)
      values (${accountId}, now() + make_interval(days => ${ANALYTICS_RETENTION_DAYS}))
      on conflict (account_id) do nothing`);
    const [row] = (await tx.execute(dsql`select ref from analytics.subjects where account_id = ${accountId}`)) as unknown as { ref: string }[];
    return row?.ref ?? null;
  });
}

/**
 * Ereignis erfassen. Validiert gegen den Ereignisplan; gibt zurück, ob gespeichert wurde.
 * Je Person, Tag und Angabe höchstens ein Eintrag (Datensparsamkeit).
 */
export async function track(accountId: string, input: AnalyticsEvent | unknown, source: "client" | "server" = "server"): Promise<boolean> {
  try {
    const event = parseAnalyticsEvent(input, source);
    if (!event) return false;
    if (!(await hasAnalyticsConsent(accountId))) return false;
    const ref = await subjectRef(accountId);
    if (!ref) return false;
    await db.execute(dsql`
      insert into analytics.events (ref, name, params, day, dedupe)
      values (${ref}, ${event.name}::analytics.event_name, ${JSON.stringify(event.params)}::jsonb, ${localDateString(new Date())}::date, ${analyticsDedupeKey(event)})
      on conflict (ref, day, dedupe) do nothing`);
    return true;
  } catch (err) {
    // NFR15: nur technischer Code, keine Werte
    console.warn(`[analytics] Erfassung übersprungen: ${err instanceof Error ? err.name : "error"} ${redactLogText(err, 80)}`);
    return false;
  }
}

/** Nach der Antwort erfassen (blockiert keine Server Action, verändert kein Ergebnis). */
export function trackLater(accountId: string, event: AnalyticsEvent): void {
  try {
    after(() => track(accountId, event).then(() => undefined));
  } catch {
    // Ausserhalb eines Anfragekontexts (z. B. Worker) wird nicht erfasst.
  }
}

/** core_flow_failed für einen technischen Fehler in einem Kernablauf (F01–F07). */
export function trackFlowFailureLater(accountId: string | null | undefined, flow: CoreFlow): void {
  if (!accountId) return;
  trackLater(accountId, { name: "core_flow_failed", params: { flow, code: "server_error" } });
}
