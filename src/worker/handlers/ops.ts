import { hostname } from "node:os";
import { sql as dsql } from "drizzle-orm";
import { db } from "@/server/db";
import { currentAlarms } from "@/server/modules/admin/ops-alarms";
import type { Handler, PeriodicTask } from "../types";

const INSTANCE = (process.env.RAILWAY_REPLICA_ID ?? hostname()).slice(0, 60);

/**
 * Beobachtbarkeit (NFR16, NFR19, US26): Lebenszeichen des Arbeiters und Betriebsalarme.
 * Alarme erscheinen als eine Zeile «[alarm] code=… wert=…» im Railway-Log (Log-Alarm/Webhook)
 * und über /api/v1/health/worker für den externen Prüfer. Nur Zähler und Codes, keine Inhalte.
 */

export const opsTasks: PeriodicTask[] = [
  {
    name: "worker-heartbeat",
    everyMs: 60 * 1000,
    run: async () => {
      await db.execute(dsql`
        insert into ops.worker_heartbeats (name, beat_at) values (${INSTANCE}, now())
        on conflict (name) do update set beat_at = now()`);
      await db.execute(dsql`delete from ops.worker_heartbeats where beat_at < now() - interval '7 days'`);
      // NFR16: Anfragezähler nur 2 Tage aufbewahren (reine Anzahlen)
      await db.execute(dsql`delete from ops.request_metrics where minute < now() - interval '2 days'`);
    },
  },
  {
    name: "ops-alarms",
    everyMs: 5 * 60 * 1000,
    run: async () => {
      const alarms = await currentAlarms();
      const codes = alarms.map((a) => a.code).join(",") || null;
      // Bei jedem Lauf melden, solange der Zustand besteht – Log-Alarme brauchen wiederholte Signale.
      for (const a of alarms) console.error(`[alarm] code=${a.code} wert=${a.value}`);
      await db.execute(dsql`
        insert into ops.worker_heartbeats (name, beat_at, alarms, alarms_at) values (${INSTANCE}, now(), ${codes}, now())
        on conflict (name) do update set beat_at = now(), alarms = excluded.alarms, alarms_at = now()`);
    },
  },
];

/**
 * Übungsereignis für den Wiederanlauf-Test (NFR19, `scripts/drills/worker-restart.ts`):
 * wartet höchstens 5 s und verändert keine Fachdaten. `fail: true` erzwingt einen Fehlversuch.
 */
export const opsHandlers: Record<string, Handler> = {
  "ops.drill": async (job) => {
    const ms = Math.min(5000, Math.max(0, Number(job.payload.ms ?? 0)));
    if (ms > 0) await new Promise((r) => setTimeout(r, ms));
    if (job.payload.fail === true) throw Object.assign(new Error("drill"), { code: "drill_failure" });
  },
};
