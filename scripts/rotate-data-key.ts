/**
 * Schlüsselrotation für DATA_ENCRYPTION_KEY (NFR10, Runbook R9 in docs/RUNBOOKS.md).
 *
 *   OLD_DATA_ENCRYPTION_KEY=<alt> DATA_ENCRYPTION_KEY=<neu> DATABASE_URL=<owner-url> \
 *     npx tsx scripts/rotate-data-key.ts --dry-run          # nur zählen
 *   … npx tsx scripts/rotate-data-key.ts [--batch=500]       # umverschlüsseln
 *
 * – Verschlüsselt alle Spalten *_encrypted und die Outbox-Nutzlasten in Batches um.
 * – Idempotent: Werte, die sich bereits mit dem neuen Schlüssel öffnen lassen, bleiben unverändert;
 *   ein zweiter Lauf meldet «umverschlüsselt 0». Abbruch und Wiederaufnahme sind jederzeit möglich.
 * – Aktualisiert nur, wenn der Wert seit dem Lesen unverändert ist (paralleler Betrieb möglich).
 * – Bricht ab, wenn das Schema verschlüsselte Spalten enthält, die hier fehlen, oder wenn die Rolle
 *   Row-Level Security nicht umgeht (Gesundheitsdaten würden sonst still übersprungen).
 * – Protokolliert nur Tabellen, Spalten und Zähler – nie Werte (NFR15).
 */
import postgres from "postgres";
import { deriveKey, emptyTally, JSON_COLUMNS, rotateJson, rotateValue, TEXT_COLUMNS, type Tally } from "./rotate-data-key-lib";

const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const BATCH = Math.min(Math.max(Number(args.find((a) => a.startsWith("--batch="))?.split("=")[1] ?? 500) || 500, 10), 5000);

function keys() {
  const oldB64 = process.env.OLD_DATA_ENCRYPTION_KEY ?? "";
  const newB64 = process.env.DATA_ENCRYPTION_KEY ?? "";
  if (!oldB64 || !newB64) throw new Error("OLD_DATA_ENCRYPTION_KEY und DATA_ENCRYPTION_KEY müssen gesetzt sein.");
  const oldKey = deriveKey(oldB64);
  const newKey = deriveKey(newB64);
  if (oldKey.equals(newKey)) throw new Error("Alter und neuer Schlüssel sind identisch.");
  return { oldKey, newKey };
}

const ident = (qualified: string) => qualified.split(".").map((p) => `"${p.replace(/"/g, "")}"`).join(".");

async function main() {
  const { oldKey, newKey } = keys();
  const url = process.env.DATABASE_URL ?? (process.env.NODE_ENV === "production" ? "" : "postgres://postgres@localhost:5432/ms");
  if (!url) throw new Error("DATABASE_URL fehlt");
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  console.log(`Verbinde mit ${new URL(url).hostname} – ${DRY ? "Probelauf (keine Änderungen)" : "Umverschlüsselung"}, Batch ${BATCH}`);

  // Vollständigkeit: jede Spalte *_encrypted im Schema muss in der Liste stehen.
  const known = new Set(TEXT_COLUMNS.flatMap((t) => t.columns.map((c) => `${t.table}.${c}`)));
  const found = await sql<{ col: string }[]>`
    select table_schema || '.' || table_name || '.' || column_name as col from information_schema.columns
    where column_name like '%\\_encrypted' and table_schema not in ('pg_catalog', 'information_schema')`;
  const unknown = found.map((r) => r.col).filter((c) => !known.has(c));
  if (unknown.length) throw new Error(`Verschlüsselte Spalten ohne Rotationsregel: ${unknown.join(", ")} – zuerst rotate-data-key-lib.ts ergänzen.`);

  // RLS: nur Eigentümer- oder Superuser-Rolle sieht alle Gesundheitsdaten.
  const [role] = await sql<{ su: boolean; bypass: boolean; owner: boolean }[]>`
    select r.rolsuper as su, r.rolbypassrls as bypass,
      (select tableowner = current_user from pg_tables where schemaname = 'health' and tablename = 'check_ins') as owner
    from pg_roles r where r.rolname = current_user`;
  if (!role?.su && !role?.bypass && !role?.owner) throw new Error("Bitte mit der Eigentümerrolle verbinden (nicht ms_app): RLS würde Gesundheitsdaten verbergen.");

  const totals = emptyTally();
  const add = (t: Tally) => {
    totals.rotated += t.rotated;
    totals.current += t.current;
    totals.unreadable += t.unreadable;
  };

  for (const { table, columns, trigger } of TEXT_COLUMNS) {
    for (const column of columns) {
      const tally = emptyTally();
      let last: string | null = null;
      for (;;) {
        const rows: { id: string; v: string }[] = await sql.unsafe(
          `select id::text as id, ${ident(column)} as v from ${ident(table)}
           where ${ident(column)} is not null ${last ? "and id > $1::uuid" : ""} order by id limit ${BATCH}`,
          last ? [last] : [],
        );
        if (rows.length === 0) break;
        last = rows[rows.length - 1].id;
        const updates: { id: string; old: string; next: string }[] = [];
        for (const r of rows) {
          const res = rotateValue(r.v, oldKey, newKey);
          tally[res.status] += 1;
          if (res.status === "rotated") updates.push({ id: r.id, old: r.v, next: res.value });
        }
        if (!DRY && updates.length) {
          await sql.begin(async (tx) => {
            if (trigger) await tx.unsafe(`alter table ${ident(table)} disable trigger ${ident(trigger)}`);
            for (const u of updates)
              await tx.unsafe(`update ${ident(table)} set ${ident(column)} = $1 where id = $2::uuid and ${ident(column)} = $3`, [u.next, u.id, u.old]);
            if (trigger) await tx.unsafe(`alter table ${ident(table)} enable trigger ${ident(trigger)}`);
          });
        }
      }
      console.log(`${table}.${column}: umverschlüsselt ${tally.rotated}, bereits neu ${tally.current}, unlesbar ${tally.unreadable}`);
      add(tally);
    }
  }

  for (const { table, column } of JSON_COLUMNS) {
    const tally = emptyTally();
    let last: string | null = null;
    for (;;) {
      const rows: { id: string; v: unknown }[] = await sql.unsafe(
        `select id::text as id, ${ident(column)} as v from ${ident(table)}
         where ${ident(column)}::text like '%"v1.%' ${last ? "and id > $1::uuid" : ""} order by id limit ${BATCH}`,
        last ? [last] : [],
      );
      if (rows.length === 0) break;
      last = rows[rows.length - 1].id;
      const updates: { id: string; old: unknown; next: unknown }[] = [];
      for (const r of rows) {
        const res = rotateJson(r.v, oldKey, newKey, tally);
        if (res.changed) updates.push({ id: r.id, old: r.v, next: res.value });
      }
      if (!DRY && updates.length) {
        await sql.begin(async (tx) => {
          for (const u of updates)
            await tx.unsafe(`update ${ident(table)} set ${ident(column)} = $1::jsonb where id = $2::uuid and ${ident(column)} = $3::jsonb`, [
              JSON.stringify(u.next),
              u.id,
              JSON.stringify(u.old),
            ]);
        });
      }
    }
    console.log(`${table}.${column} (JSON): umverschlüsselt ${tally.rotated}, bereits neu ${tally.current}, unlesbar ${tally.unreadable}`);
    add(tally);
  }

  await sql.end();
  console.log(
    `${DRY ? "Probelauf" : "Fertig"}: umverschlüsselt ${totals.rotated}, bereits neu ${totals.current}, unlesbar ${totals.unreadable}.` +
      (DRY ? " Ohne --dry-run erneut ausführen." : totals.rotated === 0 ? " Bestand vollständig mit dem neuen Schlüssel." : " Zur Kontrolle erneut ausführen (erwartet: 0)."),
  );
  // Unlesbare Werte passen zu keinem der beiden Schlüssel: nicht verändert, Ursache klären (R9).
  if (totals.unreadable > 0) process.exitCode = 2;
}

main().catch((err) => {
  console.error("Rotation abgebrochen:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
