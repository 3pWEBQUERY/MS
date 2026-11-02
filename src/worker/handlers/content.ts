import { sql as dsql } from "drizzle-orm";
import { audit } from "@/server/audit";
import { db } from "@/server/db";
import type { PeriodicTask } from "../types";

/**
 * Redaktionelle Fristen (CON03, CON05, SAF06).
 * Der Worker kann kein updateTag auslösen; die öffentlichen Abfragen sind deshalb höchstens
 * minutenweise gecacht und prüfen Prüftermine zusätzlich zur Anzeigezeit.
 */
export const contentTasks: PeriodicTask[] = [
  {
    // CON03/AT08: Nach Fristablauf öffentlich zurückziehen; publishedVersionId bleibt als interne Dokumentation.
    name: "content-withdraw-overdue-articles",
    everyMs: 15 * 60 * 1000,
    run: async () => {
      const rows = (await db.execute(dsql`
        update content.article_versions
        set status = 'withdrawn', withdrawn_at = now(),
            withdraw_reason = 'Prüftermin abgelaufen – automatisch zurückgezogen', updated_at = now()
        where status = 'published' and (review_due_at is null or review_due_at < now())
        returning id`)) as unknown as { id: string }[];
      for (const r of rows) {
        await audit({ actorId: null, actorRole: "system", action: "article.withdrawn_overdue", objectType: "article_version", objectId: r.id });
      }
      if (rows.length) console.log(`[worker] content: ${rows.length} überfällige Artikel zurückgezogen`);
    },
  },
  {
    // CON05: Angebote ohne gültige Prüfung ausblenden (Status «expired»).
    name: "content-expire-offers",
    everyMs: 15 * 60 * 1000,
    run: async () => {
      const rows = (await db.execute(dsql`
        update content.support_offers
        set status = 'expired', updated_at = now(), version = version + 1
        where status = 'published' and (next_review_at is null or next_review_at < now())
        returning id`)) as unknown as { id: string }[];
      for (const r of rows) {
        await audit({ actorId: null, actorRole: "system", action: "offer.expired", objectType: "support_offer", objectId: r.id });
      }
      if (rows.length) console.log(`[worker] content: ${rows.length} Angebote wegen abgelaufener Prüfung ausgeblendet`);
    },
  },
  {
    // SAF06: Sicherheitskontakte werden nicht automatisch entfernt (ein fehlender Notruf wäre gefährlicher),
    // aber im Arbeitsvorrat deutlich als «Verifikation überfällig» markiert. Hier nur ein Betriebssignal.
    name: "content-safety-verification-due",
    everyMs: 6 * 60 * 60 * 1000,
    run: async () => {
      const [row] = (await db.execute(dsql`
        select count(*)::int as n from content.safety_contacts
        where active = true and (next_due_at is null or next_due_at < now())`)) as unknown as { n: number }[];
      if (row?.n) console.warn(`[worker] content: ${row.n} aktive Sicherheitskontakte mit überfälliger Verifikation`);
    },
  },
];
