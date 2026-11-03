import "server-only";
import { ENERGY_SCALE, FATIGUE_SCALE, INTENSITY_SCALE, MOOD_SCALE } from "@/lib/catalog";
import { collectAccount } from "./export-collect-account";
import { collectCommunity } from "./export-collect-community";
import { collectHealth } from "./export-collect-health";
import { collectMessaging } from "./export-collect-messaging";
import { buildDiaryCsv } from "./export-format";

/**
 * Datenexport (PRI03, US09, AT02): eine JSON-Datei mit allen Bereichen und eine
 * Tagebuch-CSV. Jede Sammelfunktion liest ausschliesslich Daten dieses Kontos.
 * Inhalt: Konto, Profil, Präferenzen, Einwilligungsnachweise, Gesundheitsdaten,
 * eigene Beiträge und zugängliche eigene Gesprächsdaten (Rechte Dritter berücksichtigt).
 */
export async function buildExport(accountId: string): Promise<{ json: Buffer; csv: Buffer }> {
  const now = new Date();
  const account = await collectAccount(accountId);
  const [health, community, messaging] = await Promise.all([
    collectHealth(accountId),
    collectCommunity(accountId),
    collectMessaging(accountId),
  ]);

  const data = {
    format: "ms-plattform-datenexport",
    formatVersion: 1,
    erstellt_am_utc: now.toISOString(),
    hinweise: {
      inhalt:
        "Dieser Export enthält deine eigenen Daten. Bei Gesprächen sind von der Gegenseite nur ihr Pseudonym und die Nachrichten enthalten, die sie dir geschickt hat.",
      fehlende_werte: "Nicht erfasste Werte sind null und mit «erfasst: false» gekennzeichnet. Der Wert 0 ist ein erfasster Wert.",
      zeiten: "Zeitpunkte mit Endung _utc sind in UTC. Lokale Angaben behalten die ursprüngliche Zeitzone und den Offset in Minuten.",
      tagebuch_csv: "Die Tagebuch-CSV ist separat herunterladbar (Trennzeichen Semikolon, UTF-8).",
    },
    skalen: {
      energie: { bereich: "0–10", minimum: ENERGY_SCALE.minText, maximum: ENERGY_SCALE.maxText },
      stimmung: { bereich: "1–5", stufen: MOOD_SCALE.steps },
      fatigue: { bereich: "0–10", minimum: FATIGUE_SCALE.minText, maximum: FATIGUE_SCALE.maxText },
      symptom_staerke: { bereich: "0–10", minimum: INTENSITY_SCALE.minText, maximum: INTENSITY_SCALE.maxText },
    },
    konto: account.konto,
    profil: account.profil,
    praeferenzen: account.praeferenzen,
    einwilligungen: account.einwilligungen,
    gesundheit: health.section,
    community: community.community,
    kontakte: messaging.kontakte,
    gespraeche: messaging.gespraeche,
    blockierungen: messaging.blockierungen,
    meldungen: community.meldungen,
    einsprueche: community.einsprueche,
    massnahmen: community.massnahmen,
    merkliste: account.merkliste,
    mitteilungen: account.mitteilungen,
    datenschutzauftraege: account.datenschutzauftraege,
  };

  return {
    json: Buffer.from(JSON.stringify(data, null, 2), "utf8"),
    csv: Buffer.from(buildDiaryCsv(health.csv.checkIns, health.csv.entries), "utf8"),
  };
}
