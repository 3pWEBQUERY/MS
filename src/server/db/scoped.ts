import "server-only";
import { sql as dsql } from "drizzle-orm";
import { db, type Tx } from ".";

/**
 * Führt Gesundheitsdatenzugriffe in einer Transaktion mit gesetztem Inhaberkontext aus,
 * damit die Row-Level-Security-Policies greifen (PRD 14). Zusätzlich MUSS jede Abfrage
 * selbst nach account_id filtern – RLS ist eine zweite Schutzschicht, kein Ersatz.
 */
export async function withOwnerScope<T>(accountId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(dsql`select set_config('app.account_id', ${accountId}, true)`);
    return fn(tx);
  });
}
