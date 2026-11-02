import "server-only";
import { and, eq } from "drizzle-orm";
import { decrypt, encrypt } from "../../crypto";
import { db } from "../../db";
import { articles, articleVersions, supportOffers } from "../../db/schema";
import { articleVisibleSql } from "./articles";
import { isUuid } from "./staff";

/**
 * Kontaktformular (CON06): Spamschutz ohne visuelle Aufgaben – Mindest-Ausfüllzeit über ein
 * verschlüsseltes Zeitstempel-Token, verstecktes Honeypot-Feld und Rate-Limit.
 */
export const CONTACT_MIN_FILL_MS = 3000;
export const CONTACT_TOKEN_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function contactFormToken(now = Date.now()): string {
  return encrypt(`contact:${now}`);
}

export function readContactToken(token: string): number | null {
  try {
    const plain = decrypt(token);
    const m = /^contact:(\d{10,16})$/.exec(plain);
    return m ? Number(m[1]) : null;
  } catch {
    return null;
  }
}

export type ContactRef = { type: "article" | "offer"; id: string; title: string };

/** Referenz nur auf öffentlich bekannte Inhalte; keine sensiblen Daten werden vorausgefüllt (F03). */
export async function resolveContactRef(type: string | undefined, id: string | undefined): Promise<ContactRef | null> {
  if (!id || !isUuid(id)) return null;
  if (type === "article") {
    const [row] = await db
      .select({ title: articleVersions.title })
      .from(articles)
      .innerJoin(articleVersions, eq(articleVersions.id, articles.publishedVersionId))
      .where(and(eq(articles.id, id), articleVisibleSql))
      .limit(1);
    return row ? { type, id, title: row.title } : null;
  }
  if (type === "offer") {
    // Auch abgelaufene Angebote dürfen gemeldet werden – nie Entwürfe.
    const [row] = await db
      .select({ title: supportOffers.title, organization: supportOffers.organization, status: supportOffers.status })
      .from(supportOffers)
      .where(eq(supportOffers.id, id))
      .limit(1);
    return row && row.status !== "draft" ? { type, id, title: `${row.title} – ${row.organization}` } : null;
  }
  return null;
}
