import "server-only";
import { eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "../../db";
import { pages } from "../../db/schema";

/** Rechtliche Seiten und Regeln (S50, PRI01, SAF07) – versioniert mit Gültigkeitsdatum. */
export const LEGAL_SLUGS = ["regeln", "datenschutz", "bedingungen", "impressum", "barrierefreiheit"] as const;
export type LegalSlug = (typeof LEGAL_SLUGS)[number];

export type LegalPage = { slug: string; title: string; body: string; textVersion: string; validFrom: string; updatedAt: string };

/** Gecacht (Tag «legal»); bei Datenbankfehler null mit kurzer Lebensdauer, damit die Seite nie abbricht. */
export async function getLegalPage(slug: LegalSlug): Promise<LegalPage | null> {
  "use cache";
  cacheTag("legal");
  try {
    const [row] = await db
      .select({
        slug: pages.slug,
        title: pages.title,
        body: pages.body,
        textVersion: pages.textVersion,
        validFrom: pages.validFrom,
        updatedAt: pages.updatedAt,
      })
      .from(pages)
      .where(eq(pages.slug, slug))
      .limit(1);
    if (row) cacheLife("hours");
    else cacheLife("minutes");
    return row ? { ...row, updatedAt: row.updatedAt.toISOString() } : null;
  } catch {
    cacheLife("minutes");
    return null;
  }
}
