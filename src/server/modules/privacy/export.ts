import "server-only";
import { and, asc, desc, eq, inArray, isNull, lt, or, sql as dsql } from "drizzle-orm";
import {
  ENERGY_SCALE,
  FATIGUE_SCALE,
  INTENSITY_SCALE,
  MOOD_SCALE,
  cantonName,
  interestLabel,
} from "@/lib/catalog";
import { decryptBuffer, decryptOptional, encryptBuffer } from "../../crypto";
import { db } from "../../db";
import {
  accounts,
  appeals,
  blocks,
  bookmarks,
  checkIns,
  comments,
  communityProfiles,
  consentRecords,
  contactRelationships,
  conversations,
  diaryEntries,
  exportJobs,
  groupMemberships,
  groups,
  messages,
  notifications,
  posts,
  privacyRequests,
  reports,
  sanctions,
  sessions,
  symptomDefinitions,
  symptomObservations,
  topics,
  userPreferences,
} from "../../db/schema";
import { withOwnerScope } from "../../db/scoped";
import { deleteObject, getObject, PREFIX, putObject, storageConfigured } from "../../storage";

/**
 * Datenexport (PRI03, US09, AT02): eine JSON-Datei mit allen Bereichen und eine
 * Tagebuch-CSV als getrennte Downloads. Beide Dateien werden anwendungsseitig
 * verschlüsselt im privaten Bucket abgelegt und höchstens 24 Stunden bereitgestellt.
 */
export const EXPORT_TTL_MS = 24 * 60 * 60 * 1000;
export const EXPORT_FILES = ["json", "csv"] as const;
export type ExportFile = (typeof EXPORT_FILES)[number];

export function exportBaseKey(accountId: string, jobId: string) {
  return `${PREFIX.exports}${accountId}/${jobId}`;
}

export function exportFileKey(objectKey: string, file: ExportFile) {
  return `${objectKey}.${file}`;
}

/* ───────────────────────── CSV (CSV-Injection-Schutz) ───────────────────────── */

/** Zellen, die mit = + - @ Tab oder CR beginnen, werden mit ' entschärft; Zahlen bleiben Zahlen. */
export function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  let s = value;
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export function csvLine(cells: (string | number | null | undefined)[]): string {
  return cells.map(csvCell).join(";");
}

const CSV_HEADER = [
  "typ",
  "eintrag_id",
  "lokales_datum",
  "lokale_zeit",
  "zeitzone",
  "utc_offset_minuten",
  "beobachtet_utc",
  "energie_0_10",
  "stimmung_1_5",
  "fatigue_0_10",
  "symptom",
  "symptom_staerke_0_10",
  "symptom_dauer_minuten",
  "schlafbeobachtung",
  "notiz",
  "skalenfassung",
  "quelle",
  "erfasst_am_utc",
];

/* ───────────────────────── Gesundheitsdaten (nur Inhaber, RLS-Kontext) ───────────────────────── */

const measure = (value: number | null, skala: string) => ({ wert: value, erfasst: value !== null, skala });

async function loadHealth(accountId: string) {
  return withOwnerScope(accountId, async (tx) => {
    const ci = await tx
      .select({
        id: checkIns.id,
        localDate: checkIns.localDate,
        timezone: checkIns.timezone,
        utcOffsetMinutes: checkIns.utcOffsetMinutes,
        energy: checkIns.energy,
        mood: checkIns.mood,
        fatigue: checkIns.fatigue,
        noteEncrypted: checkIns.noteEncrypted,
        scaleVersion: checkIns.scaleVersion,
        createdAt: checkIns.createdAt,
        updatedAt: checkIns.updatedAt,
      })
      .from(checkIns)
      .where(eq(checkIns.accountId, accountId))
      .orderBy(asc(checkIns.localDate));
    const entries = await tx
      .select({
        id: diaryEntries.id,
        kind: diaryEntries.kind,
        observedAt: diaryEntries.observedAt,
        localDate: diaryEntries.localDate,
        localTime: diaryEntries.localTime,
        timezone: diaryEntries.timezone,
        utcOffsetMinutes: diaryEntries.utcOffsetMinutes,
        fatigue: diaryEntries.fatigue,
        sleepNoteEncrypted: diaryEntries.sleepNoteEncrypted,
        noteEncrypted: diaryEntries.noteEncrypted,
        scaleVersion: diaryEntries.scaleVersion,
        createdAt: diaryEntries.createdAt,
        updatedAt: diaryEntries.updatedAt,
      })
      .from(diaryEntries)
      .where(eq(diaryEntries.accountId, accountId))
      .orderBy(asc(diaryEntries.observedAt));
    const obs = await tx
      .select({
        entryId: symptomObservations.entryId,
        label: symptomObservations.labelSnapshot,
        intensity: symptomObservations.intensity,
        durationMinutes: symptomObservations.durationMinutes,
        code: symptomDefinitions.code,
        own: symptomDefinitions.ownerAccountId,
      })
      .from(symptomObservations)
      .leftJoin(symptomDefinitions, eq(symptomDefinitions.id, symptomObservations.definitionId))
      .where(eq(symptomObservations.accountId, accountId))
      .orderBy(asc(symptomObservations.createdAt));
    const ownDefs = await tx
      .select({ label: symptomDefinitions.label, active: symptomDefinitions.active, createdAt: symptomDefinitions.createdAt })
      .from(symptomDefinitions)
      .where(eq(symptomDefinitions.ownerAccountId, accountId))
      .orderBy(asc(symptomDefinitions.createdAt));
    return { ci, entries, obs, ownDefs };
  });
}

/* ───────────────────────── Export erzeugen ───────────────────────── */

export async function buildExport(accountId: string): Promise<{ json: Buffer; csv: Buffer }> {
  const now = new Date();
  const [account] = await db
    .select({
      email: accounts.email,
      status: accounts.status,
      createdAt: accounts.createdAt,
      emailVerifiedAt: accounts.emailVerifiedAt,
      audienceConfirmedAt: accounts.audienceConfirmedAt,
      termsVersion: accounts.termsVersion,
      mfaEnabled: accounts.mfaEnabled,
    })
    .from(accounts)
    .where(eq(accounts.id, accountId));
  if (!account) throw new Error("account_missing");

  const [profile] = await db
    .select({
      pseudonym: communityProfiles.pseudonym,
      interests: communityProfiles.interests,
      canton: communityProfiles.canton,
      discoverable: communityProfiles.discoverable,
      onboardingGoal: communityProfiles.onboardingGoal,
      onboardingCompletedAt: communityProfiles.onboardingCompletedAt,
      rulesAcceptedVersion: communityProfiles.rulesAcceptedVersion,
      rulesAcceptedAt: communityProfiles.rulesAcceptedAt,
      createdAt: communityProfiles.createdAt,
      updatedAt: communityProfiles.updatedAt,
    })
    .from(communityProfiles)
    .where(eq(communityProfiles.accountId, accountId));

  const [prefs] = await db
    .select({
      locale: userPreferences.locale,
      timezone: userPreferences.timezone,
      simpleView: userPreferences.simpleView,
      textScale: userPreferences.textScale,
      motion: userPreferences.motion,
      theme: userPreferences.theme,
      emailSocial: userPreferences.emailSocial,
      inAppTypes: userPreferences.inAppTypes,
      quietStart: userPreferences.quietStart,
      quietEnd: userPreferences.quietEnd,
      pausedUntil: userPreferences.pausedUntil,
    })
    .from(userPreferences)
    .where(eq(userPreferences.accountId, accountId));

  const consents = await db
    .select({
      purpose: consentRecords.purpose,
      textVersion: consentRecords.textVersion,
      decision: consentRecords.decision,
      channel: consentRecords.channel,
      decidedAt: consentRecords.decidedAt,
    })
    .from(consentRecords)
    .where(eq(consentRecords.accountId, accountId))
    .orderBy(asc(consentRecords.decidedAt));

  const health = await loadHealth(accountId);

  const ownPosts = await db
    .select({
      id: posts.id,
      title: posts.title,
      body: posts.body,
      status: posts.status,
      topic: topics.name,
      group: groups.title,
      publishedAt: posts.publishedAt,
      editedAt: posts.editedAt,
    })
    .from(posts)
    .leftJoin(topics, eq(topics.id, posts.topicId))
    .leftJoin(groups, eq(groups.id, posts.groupId))
    .where(eq(posts.authorId, accountId))
    .orderBy(asc(posts.publishedAt));

  const ownComments = await db
    .select({
      id: comments.id,
      postId: comments.postId,
      body: comments.body,
      status: comments.status,
      createdAt: comments.createdAt,
      editedAt: comments.editedAt,
    })
    .from(comments)
    .where(eq(comments.authorId, accountId))
    .orderBy(asc(comments.createdAt));

  const memberships = await db
    .select({ group: groups.title, status: groupMemberships.status, createdAt: groupMemberships.createdAt })
    .from(groupMemberships)
    .innerJoin(groups, eq(groups.id, groupMemberships.groupId))
    .where(eq(groupMemberships.accountId, accountId));

  // Kontakte und Gespräche: Gegenseite nur mit Pseudonym (Rechte Dritter, PRI03)
  const rels = await db
    .select({
      id: contactRelationships.id,
      low: contactRelationships.accountLow,
      high: contactRelationships.accountHigh,
      initiatorId: contactRelationships.initiatorId,
      status: contactRelationships.status,
      requestedAt: contactRelationships.requestedAt,
      endedAt: contactRelationships.endedAt,
      createdAt: contactRelationships.createdAt,
    })
    .from(contactRelationships)
    .where(or(eq(contactRelationships.accountLow, accountId), eq(contactRelationships.accountHigh, accountId)));

  const blockRows = await db
    .select({ blockedId: blocks.blockedId, createdAt: blocks.createdAt, liftedAt: blocks.liftedAt })
    .from(blocks)
    .where(eq(blocks.blockerId, accountId));

  const otherIds = [...new Set([...rels.map((r) => (r.low === accountId ? r.high : r.low)), ...blockRows.map((b) => b.blockedId)])];
  const names = new Map<string, string>();
  if (otherIds.length > 0) {
    const rows = await db
      .select({ id: communityProfiles.accountId, pseudonym: communityProfiles.pseudonym })
      .from(communityProfiles)
      .where(inArray(communityProfiles.accountId, otherIds));
    for (const r of rows) names.set(r.id, r.pseudonym);
  }
  const nameOf = (id: string) => names.get(id) ?? "Ehemaliges Mitglied";

  const convs = rels.length
    ? await db
        .select({ id: conversations.id, relationshipId: conversations.relationshipId })
        .from(conversations)
        .where(inArray(conversations.relationshipId, rels.map((r) => r.id)))
    : [];
  const msgs = convs.length
    ? await db
        .select({
          conversationId: messages.conversationId,
          senderId: messages.senderId,
          seq: messages.seq,
          bodyEncrypted: messages.bodyEncrypted,
          deletedAt: messages.deletedAt,
          createdAt: messages.createdAt,
        })
        .from(messages)
        .where(inArray(messages.conversationId, convs.map((c) => c.id)))
        .orderBy(asc(messages.conversationId), asc(messages.seq))
    : [];

  const ownReports = await db
    .select({
      receiptNumber: reports.receiptNumber,
      targetType: reports.targetType,
      reason: reports.reason,
      detailsEncrypted: reports.detailsEncrypted,
      createdAt: reports.createdAt,
    })
    .from(reports)
    .where(eq(reports.reporterId, accountId))
    .orderBy(asc(reports.createdAt));

  const ownAppeals = await db
    .select({ status: appeals.status, reasonEncrypted: appeals.reasonEncrypted, createdAt: appeals.createdAt, decidedAt: appeals.decidedAt })
    .from(appeals)
    .where(eq(appeals.appellantId, accountId));

  const ownSanctions = await db
    .select({ kind: sanctions.kind, startsAt: sanctions.startsAt, endsAt: sanctions.endsAt, liftedAt: sanctions.liftedAt })
    .from(sanctions)
    .where(eq(sanctions.accountId, accountId));

  const marks = await db
    .select({ targetType: bookmarks.targetType, targetId: bookmarks.targetId, createdAt: bookmarks.createdAt })
    .from(bookmarks)
    .where(eq(bookmarks.accountId, accountId))
    .orderBy(desc(bookmarks.createdAt));

  const hints = await db
    .select({ type: notifications.type, createdAt: notifications.createdAt, readAt: notifications.readAt })
    .from(notifications)
    .where(eq(notifications.accountId, accountId))
    .orderBy(desc(notifications.createdAt))
    .limit(1000);

  const ownSessions = await db
    .select({ deviceType: sessions.deviceType, browser: sessions.browser, createdAt: sessions.createdAt, lastUsedAt: sessions.lastUsedAt })
    .from(sessions)
    .where(and(eq(sessions.accountId, accountId), isNull(sessions.revokedAt)));

  const requests = await db
    .select({
      receiptNumber: privacyRequests.receiptNumber,
      type: privacyRequests.type,
      status: privacyRequests.status,
      createdAt: privacyRequests.createdAt,
      completedAt: privacyRequests.completedAt,
    })
    .from(privacyRequests)
    .where(eq(privacyRequests.accountId, accountId));

  const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);
  const obsByEntry = new Map<string, typeof health.obs>();
  for (const o of health.obs) obsByEntry.set(o.entryId, [...(obsByEntry.get(o.entryId) ?? []), o]);

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
    konto: {
      email: account.email,
      status: account.status,
      erstellt_am_utc: iso(account.createdAt),
      email_bestaetigt_am_utc: iso(account.emailVerifiedAt),
      zielgruppe_bestaetigt_am_utc: iso(account.audienceConfirmedAt),
      bedingungen_fassung: account.termsVersion,
      zweiter_faktor_aktiv: account.mfaEnabled,
      aktive_sitzungen: ownSessions.map((s) => ({
        geraet: s.deviceType,
        browser: s.browser,
        angemeldet_am_utc: iso(s.createdAt),
        zuletzt_genutzt_utc: iso(s.lastUsedAt),
      })),
    },
    profil: profile
      ? {
          pseudonym: profile.pseudonym,
          interessen: profile.interests.map((c) => ({ code: c, bezeichnung: interestLabel(c) })),
          kanton: profile.canton ? { code: profile.canton, name: cantonName(profile.canton) } : null,
          auffindbar: profile.discoverable,
          nutzungsziel: profile.onboardingGoal,
          einfuehrung_abgeschlossen_utc: iso(profile.onboardingCompletedAt),
          community_regeln_fassung: profile.rulesAcceptedVersion,
          community_regeln_akzeptiert_utc: iso(profile.rulesAcceptedAt),
        }
      : null,
    praeferenzen: prefs
      ? {
          sprache: prefs.locale,
          zeitzone: prefs.timezone,
          einfache_ansicht: prefs.simpleView,
          schriftgroesse_prozent: prefs.textScale,
          bewegung: prefs.motion,
          farbschema: prefs.theme,
          email_hinweise: prefs.emailSocial,
          mitteilungsarten: prefs.inAppTypes,
          ruhezeit: { von: prefs.quietStart, bis: prefs.quietEnd },
          pausiert_bis_utc: iso(prefs.pausedUntil),
        }
      : null,
    einwilligungen: consents.map((c) => ({
      zweck: c.purpose,
      textfassung: c.textVersion,
      entscheidung: c.decision,
      kanal: c.channel,
      zeitpunkt_utc: iso(c.decidedAt),
    })),
    gesundheit: {
      quelle: "selbst erfasst",
      check_ins: health.ci.map((c) => ({
        id: c.id,
        lokales_datum: c.localDate,
        zeitzone: c.timezone,
        utc_offset_minuten: c.utcOffsetMinutes,
        energie: measure(c.energy, "0–10"),
        stimmung: measure(c.mood, "1–5"),
        fatigue: measure(c.fatigue, "0–10"),
        notiz: decryptOptional(c.noteEncrypted),
        skalenfassung: c.scaleVersion,
        quelle: "selbst erfasst",
        erfasst_am_utc: iso(c.createdAt),
        geaendert_am_utc: iso(c.updatedAt),
      })),
      tagebuch: health.entries.map((e) => ({
        id: e.id,
        art: e.kind === "fatigue" ? "fatigue" : "symptom",
        beobachtet_utc: iso(e.observedAt),
        lokales_datum: e.localDate,
        lokale_zeit: e.localTime,
        zeitzone: e.timezone,
        utc_offset_minuten: e.utcOffsetMinutes,
        fatigue: measure(e.fatigue, "0–10"),
        schlafbeobachtung: decryptOptional(e.sleepNoteEncrypted),
        notiz: decryptOptional(e.noteEncrypted),
        symptome: (obsByEntry.get(e.id) ?? []).map((o) => ({
          bezeichnung: o.label,
          katalogcode: o.own ? null : o.code,
          eigene_bezeichnung: Boolean(o.own),
          staerke: measure(o.intensity, "0–10"),
          dauer_minuten: { wert: o.durationMinutes, erfasst: o.durationMinutes !== null },
        })),
        skalenfassung: e.scaleVersion,
        quelle: "selbst erfasst",
        erfasst_am_utc: iso(e.createdAt),
        geaendert_am_utc: iso(e.updatedAt),
      })),
      eigene_symptombezeichnungen: health.ownDefs.map((d) => ({
        bezeichnung: d.label,
        aktiv: d.active,
        angelegt_am_utc: iso(d.createdAt),
      })),
    },
    community: {
      beitraege: ownPosts.map((p) => ({
        id: p.id,
        titel: p.title,
        text: p.status === "deleted" ? null : p.body || null,
        status: p.status,
        thema: p.topic,
        gruppe: p.group,
        veroeffentlicht_utc: iso(p.publishedAt),
        bearbeitet_utc: iso(p.editedAt),
      })),
      antworten: ownComments.map((c) => ({
        id: c.id,
        beitrag_id: c.postId,
        text: c.status === "deleted" ? null : c.body || null,
        status: c.status,
        erstellt_utc: iso(c.createdAt),
        bearbeitet_utc: iso(c.editedAt),
      })),
      gruppen: memberships.map((m) => ({ gruppe: m.group, status: m.status, seit_utc: iso(m.createdAt) })),
    },
    kontakte: rels.map((r) => {
      const other = r.low === accountId ? r.high : r.low;
      return {
        pseudonym: nameOf(other),
        status: r.status,
        angefragt_von: r.initiatorId === accountId ? "ich" : "gegenseite",
        angefragt_utc: iso(r.requestedAt ?? r.createdAt),
        beendet_utc: iso(r.endedAt),
      };
    }),
    gespraeche: convs.map((c) => {
      const rel = rels.find((r) => r.id === c.relationshipId)!;
      const other = rel.low === accountId ? rel.high : rel.low;
      return {
        gegenseite: nameOf(other),
        nachrichten: msgs
          .filter((m) => m.conversationId === c.id)
          .map((m) => ({
            nummer: m.seq,
            von: m.senderId === accountId ? "ich" : "gegenseite",
            zeitpunkt_utc: iso(m.createdAt),
            text: m.bodyEncrypted ? decryptOptional(m.bodyEncrypted) : null,
            entfernt: !m.bodyEncrypted || m.deletedAt !== null,
          })),
      };
    }),
    blockierungen: blockRows.map((b) => ({
      pseudonym: nameOf(b.blockedId),
      seit_utc: iso(b.createdAt),
      aufgehoben_utc: iso(b.liftedAt),
    })),
    meldungen: ownReports.map((r) => ({
      beleg: r.receiptNumber,
      zieltyp: r.targetType,
      grund: r.reason,
      details: decryptOptional(r.detailsEncrypted),
      zeitpunkt_utc: iso(r.createdAt),
    })),
    einsprueche: ownAppeals.map((a) => ({
      status: a.status,
      begruendung: decryptOptional(a.reasonEncrypted),
      eingereicht_utc: iso(a.createdAt),
      entschieden_utc: iso(a.decidedAt),
    })),
    massnahmen: ownSanctions.map((s) => ({
      art: s.kind,
      ab_utc: iso(s.startsAt),
      bis_utc: iso(s.endsAt),
      aufgehoben_utc: iso(s.liftedAt),
    })),
    merkliste: marks.map((m) => ({ typ: m.targetType, ziel_id: m.targetId, gespeichert_utc: iso(m.createdAt) })),
    mitteilungen: hints.map((h) => ({ art: h.type, zeitpunkt_utc: iso(h.createdAt), gelesen_utc: iso(h.readAt) })),
    datenschutzauftraege: requests.map((r) => ({
      beleg: r.receiptNumber,
      typ: r.type,
      status: r.status,
      erstellt_utc: iso(r.createdAt),
      abgeschlossen_utc: iso(r.completedAt),
    })),
  };

  // Tagebuch-CSV: eine Zeile je Check-in bzw. je Symptom eines Eintrags; leere Zelle = nicht erfasst
  const lines = [csvLine(CSV_HEADER)];
  for (const c of health.ci) {
    lines.push(
      csvLine([
        "check_in",
        c.id,
        c.localDate,
        null,
        c.timezone,
        c.utcOffsetMinutes,
        null,
        c.energy,
        c.mood,
        c.fatigue,
        null,
        null,
        null,
        null,
        decryptOptional(c.noteEncrypted),
        c.scaleVersion,
        "selbst erfasst",
        iso(c.createdAt),
      ]),
    );
  }
  for (const e of health.entries) {
    const base = [e.id, e.localDate, e.localTime, e.timezone, e.utcOffsetMinutes, iso(e.observedAt), null, null, e.fatigue] as const;
    const sleep = decryptOptional(e.sleepNoteEncrypted);
    const note = decryptOptional(e.noteEncrypted);
    const list = obsByEntry.get(e.id) ?? [];
    if (list.length === 0) {
      lines.push(csvLine([`tagebuch_${e.kind}`, ...base, null, null, null, sleep, note, e.scaleVersion, "selbst erfasst", iso(e.createdAt)]));
    }
    for (const o of list) {
      lines.push(
        csvLine([
          `tagebuch_${e.kind}`,
          ...base,
          o.label,
          o.intensity,
          o.durationMinutes,
          sleep,
          note,
          e.scaleVersion,
          "selbst erfasst",
          iso(e.createdAt),
        ]),
      );
    }
  }

  return {
    json: Buffer.from(JSON.stringify(data, null, 2), "utf8"),
    // BOM, damit Tabellenprogramme Umlaute korrekt anzeigen
    csv: Buffer.from(`﻿${lines.join("\r\n")}\r\n`, "utf8"),
  };
}

/* ───────────────────────── Ablage und Lebenszyklus ───────────────────────── */

/** Worker «export.generate»: erzeugen, verschlüsseln, ablegen, bereitstellen (DIA08, PRI03). */
export async function generateExport(jobId: string, attempt: number): Promise<void> {
  const [job] = await db
    .select({ id: exportJobs.id, accountId: exportJobs.accountId, status: exportJobs.status })
    .from(exportJobs)
    .where(eq(exportJobs.id, jobId));
  if (!job || job.status === "ready" || job.status === "expired") return;
  if (job.status === "failed") return;

  const [acc] = await db.select({ status: accounts.status }).from(accounts).where(eq(accounts.id, job.accountId));
  if (!acc || acc.status === "deletion_pending" || acc.status === "deleted") {
    await db.update(exportJobs).set({ status: "failed", errorCode: "account_inactive" }).where(eq(exportJobs.id, jobId));
    return;
  }
  if (!storageConfigured()) {
    // Keine Ersatzablage in der Datenbank: klarer Fehlerzustand statt stiller Annahme.
    await db.update(exportJobs).set({ status: "failed", errorCode: "storage_not_configured" }).where(eq(exportJobs.id, jobId));
    return;
  }

  await db.update(exportJobs).set({ status: "running", errorCode: null }).where(eq(exportJobs.id, jobId));
  const objectKey = exportBaseKey(job.accountId, job.id);
  try {
    const files = await buildExport(job.accountId);
    const json = encryptBuffer(files.json);
    const csv = encryptBuffer(files.csv);
    await putObject(exportFileKey(objectKey, "json"), json, "application/octet-stream");
    await putObject(exportFileKey(objectKey, "csv"), csv, "application/octet-stream");
    const readyAt = new Date();
    const done = await db
      .update(exportJobs)
      .set({
        status: "ready",
        objectKey,
        sizeBytes: files.json.length + files.csv.length,
        readyAt,
        expiresAt: new Date(readyAt.getTime() + EXPORT_TTL_MS),
      })
      .where(and(eq(exportJobs.id, jobId), eq(exportJobs.status, "running")))
      .returning({ id: exportJobs.id });
    // Inzwischen abgebrochen (z. B. Löschung der Gesundheitsdaten): Dateien sofort entfernen.
    if (done.length === 0) await removeExportObjects(objectKey);
  } catch (err) {
    if (attempt >= 5) {
      await db.update(exportJobs).set({ status: "failed", errorCode: "generation_failed" }).where(eq(exportJobs.id, jobId));
      await removeExportObjects(objectKey).catch(() => {});
      return;
    }
    await db.update(exportJobs).set({ status: "queued", errorCode: "retrying" }).where(eq(exportJobs.id, jobId));
    throw err;
  }
}

export async function removeExportObjects(objectKey: string) {
  for (const f of EXPORT_FILES) await deleteObject(exportFileKey(objectKey, f));
}

/** Periodisch: abgelaufene Exporte aus dem Bucket löschen und als «expired» markieren (PRD 11). */
export async function expireExports(): Promise<void> {
  const due = await db
    .select({ id: exportJobs.id, objectKey: exportJobs.objectKey })
    .from(exportJobs)
    .where(and(eq(exportJobs.status, "ready"), lt(exportJobs.expiresAt, new Date())))
    .limit(200);
  for (const job of due) {
    if (job.objectKey) {
      if (!storageConfigured()) continue;
      await removeExportObjects(job.objectKey);
    }
    await db.update(exportJobs).set({ status: "expired", objectKey: null }).where(eq(exportJobs.id, job.id));
  }
  // Hängengebliebene Aufträge nach 6 Stunden als fehlgeschlagen kennzeichnen
  await db
    .update(exportJobs)
    .set({ status: "failed", errorCode: "timeout" })
    .where(and(inArray(exportJobs.status, ["queued", "running"]), dsql`${exportJobs.createdAt} < now() - interval '6 hours'`));
}

/** Download: entschlüsselte Datei (Prüfung von Sitzung, Eigentum und Ablauf erfolgt im Route Handler). */
export async function readExportFile(objectKey: string, file: ExportFile): Promise<Buffer | null> {
  const obj = await getObject(exportFileKey(objectKey, file));
  if (!obj) return null;
  return decryptBuffer(Buffer.from(obj.body));
}

/* ───────────────────────── Abfragen für S15 / S17 ───────────────────────── */

export type ExportJobView = {
  id: string;
  status: "queued" | "running" | "ready" | "expired" | "failed";
  createdAt: Date;
  readyAt: Date | null;
  expiresAt: Date | null;
  downloadedAt: Date | null;
  sizeBytes: number | null;
  errorCode: string | null;
};

const jobFields = {
  id: exportJobs.id,
  status: exportJobs.status,
  createdAt: exportJobs.createdAt,
  readyAt: exportJobs.readyAt,
  expiresAt: exportJobs.expiresAt,
  downloadedAt: exportJobs.downloadedAt,
  sizeBytes: exportJobs.sizeBytes,
  errorCode: exportJobs.errorCode,
};

/** Bereitgestellt, aber abgelaufen gilt sofort als abgelaufen – auch bevor die Bereinigung lief. */
function effective(job: ExportJobView): ExportJobView {
  if (job.status === "ready" && job.expiresAt && job.expiresAt.getTime() <= Date.now()) return { ...job, status: "expired" };
  return job;
}

export async function listOwnExports(accountId: string): Promise<ExportJobView[]> {
  const rows = await db
    .select(jobFields)
    .from(exportJobs)
    .where(eq(exportJobs.accountId, accountId))
    .orderBy(desc(exportJobs.createdAt))
    .limit(10);
  return rows.map(effective);
}

export async function getOwnExport(accountId: string, jobId: string): Promise<ExportJobView | null> {
  const [row] = await db
    .select(jobFields)
    .from(exportJobs)
    .where(and(eq(exportJobs.id, jobId), eq(exportJobs.accountId, accountId)))
    .limit(1);
  return row ? effective(row) : null;
}
