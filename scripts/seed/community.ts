import { and, eq, isNull } from "drizzle-orm";
import * as s from "../../src/server/db/schema";
import type { SeedContext } from "./types";

/**
 * Community-Startbestand (PRD 10 «Kalte Startphase»): Themen, sechs betreute Gruppen mit
 * Regeln, verantwortlicher Moderation und je einem Begrüssungsbeitrag mit Gesprächsimpuls.
 * Alle Beiträge stammen von Mitarbeitenden (klar als Team erkennbar) – keine erfundenen
 * Mitglieder-Erfahrungsberichte, keine simulierte Aktivität. Idempotent.
 */

const TOPICS: { slug: string; name: string; description: string }[] = [
  { slug: "neu-mit-ms", name: "Neu mit MS", description: "Erste Orientierung und Fragen nach der Diagnose" },
  { slug: "alltag", name: "Alltag", description: "Energie einteilen, Haushalt, Organisation" },
  { slug: "beruf", name: "Beruf", description: "Arbeit, Ausbildung, Gespräche mit Arbeitgebenden" },
  { slug: "familie", name: "Familie", description: "Partnerschaft, Kinder, Angehörige und Freundschaften" },
  { slug: "bewegung", name: "Bewegung", description: "Sport, Spaziergänge und Bewegung im eigenen Tempo" },
  { slug: "rechte-versicherungen", name: "Rechte und Versicherungen", description: "IV, Krankenkasse, Sozialversicherungen" },
  { slug: "freizeit", name: "Freizeit", description: "Hobbys, Kultur, Reisen und Erholung" },
];

const BASE_RULES = [
  "Wir begegnen uns respektvoll. Jede Erfahrung mit MS ist anders.",
  "Wir teilen persönliche Erfahrungen, aber keine Behandlungspläne oder Therapieanweisungen für andere.",
  "Wir schützen die Privatsphäre: keine Namen, Fotos oder Daten anderer Personen und keine Gesundheitsunterlagen.",
  "Keine Werbung, keine Verkaufsangebote und keine Spendenaufrufe.",
  "Was in der Gruppe geschrieben wird, bleibt in der Gruppe.",
  "Wenn dir etwas nicht richtig vorkommt, nutze «Melden». Die Moderation ist täglich von 09 bis 18 Uhr erreichbar.",
];

type GroupSeed = {
  slug: string;
  title: string;
  topic: string;
  type: "open" | "closed";
  discoverable: boolean;
  description: string;
  extraRule?: string;
  moderator: "moderator" | "lead";
  welcome: { title: string; body: string };
};

const GROUPS: GroupSeed[] = [
  {
    slug: "kennenlernen-neu-mit-ms",
    title: "Kennenlernen – neu mit MS",
    topic: "neu-mit-ms",
    type: "open",
    discoverable: true,
    description:
      "Ein ruhiger Ort für die ersten Schritte. Für alle, die seit Kurzem mit der Diagnose leben oder sich neu orientieren.",
    extraRule: "Fragen sind immer willkommen – auch solche, die dir klein vorkommen.",
    moderator: "moderator",
    welcome: {
      title: "Willkommen in «Kennenlernen – neu mit MS»",
      body:
        "Grüezi und schön, dass du da bist.\n\n" +
        "Diese Gruppe wird vom Moderationsteam betreut. Hier darfst du in deinem Tempo ankommen – mitlesen ist genauso in Ordnung wie schreiben.\n\n" +
        "Gesprächsimpuls: Was hat dir in den ersten Wochen geholfen, dich zu orientieren? Oder welche Frage beschäftigt dich gerade am meisten?\n\n" +
        "Bitte denk daran: Hier teilen wir Erfahrungen. Fragen zu deiner Behandlung klärst du am besten mit deiner Fachperson.\n\n" +
        "Team Moderation",
    },
  },
  {
    slug: "alltag-und-energie",
    title: "Alltag und Energie einteilen",
    topic: "alltag",
    type: "open",
    discoverable: true,
    description: "Austausch über Pausen, Planung und kleine Alltagshilfen – ohne Leistungsdruck.",
    moderator: "moderator",
    welcome: {
      title: "Willkommen – Alltag und Energie",
      body:
        "Willkommen in dieser Gruppe. Das Moderationsteam begleitet den Austausch.\n\n" +
        "Gesprächsimpuls: Gibt es eine kleine Gewohnheit oder ein Hilfsmittel, das deinen Alltag etwas leichter macht?\n\n" +
        "Es gibt keine richtigen oder falschen Antworten – und keine Pflicht, etwas zu schreiben.\n\n" +
        "Team Moderation",
    },
  },
  {
    slug: "bewegung-im-eigenen-tempo",
    title: "Bewegung im eigenen Tempo",
    topic: "bewegung",
    type: "open",
    discoverable: true,
    description: "Spazieren, Schwimmen, Yoga oder einfach draussen sein – jede Form von Bewegung zählt.",
    extraRule: "Wir vergleichen keine Leistungen. Jede Bewegung im eigenen Tempo ist gleich viel wert.",
    moderator: "lead",
    welcome: {
      title: "Willkommen – Bewegung im eigenen Tempo",
      body:
        "Schön, dass du hier bist. Diese Gruppe betreut die Moderationsleitung.\n\n" +
        "Gesprächsimpuls: Welche Art von Bewegung tut dir gut – und was hilft dir an Tagen mit wenig Energie?\n\n" +
        "Bitte gib keine Trainings- oder Therapiepläne für andere vor. Für individuelle Empfehlungen ist deine Fachperson die richtige Ansprechstelle.\n\n" +
        "Team Moderationsleitung",
    },
  },
  {
    slug: "beruf-und-arbeit",
    title: "Beruf und Arbeit mit MS",
    topic: "beruf",
    type: "closed",
    discoverable: true,
    description:
      "Geschlossener Raum für Fragen rund um Arbeit, Ausbildung und Gespräche am Arbeitsplatz. Aufnahme auf Anfrage.",
    extraRule: "Nenne keine Arbeitgebenden, Vorgesetzten oder Kolleginnen und Kollegen mit Namen.",
    moderator: "lead",
    welcome: {
      title: "Willkommen in «Beruf und Arbeit mit MS»",
      body:
        "Willkommen in dieser geschlossenen Gruppe. Beiträge hier sehen nur aufgenommene Mitglieder.\n\n" +
        "Gesprächsimpuls: Was hat dir bei Gesprächen am Arbeitsplatz geholfen – oder was würdest du gerne einmal mit anderen besprechen?\n\n" +
        "Für rechtliche Fragen findest du unter «Hilfe» Schweizer Beratungsstellen.\n\n" +
        "Team Moderationsleitung",
    },
  },
  {
    slug: "familie-und-partnerschaft",
    title: "Familie und Partnerschaft",
    topic: "familie",
    type: "closed",
    discoverable: true,
    description: "Geschlossener Austausch über Partnerschaft, Kinder und das Zusammenleben mit MS. Aufnahme auf Anfrage.",
    extraRule: "Keine Fotos, Namen oder Details über Kinder und Angehörige.",
    moderator: "moderator",
    welcome: {
      title: "Willkommen – Familie und Partnerschaft",
      body:
        "Willkommen in dieser geschlossenen Gruppe. Das Moderationsteam begleitet den Austausch.\n\n" +
        "Gesprächsimpuls: Wie sprichst du in deiner Familie über MS? Was hat geholfen, was war schwierig?\n\n" +
        "Bitte schütze die Privatsphäre deiner Angehörigen – sie haben hier kein eigenes Konto.\n\n" +
        "Team Moderation",
    },
  },
  {
    slug: "pilotgruppe-barrierefreiheit",
    title: "Pilotgruppe Barrierefreiheit",
    topic: "freizeit",
    type: "closed",
    discoverable: false,
    description:
      "Verborgene Gruppe für Mitglieder, die im Pilot Rückmeldungen zu Bedienbarkeit und Barrierefreiheit der Plattform geben.",
    extraRule: "Rückmeldungen betreffen die Plattform, nicht einzelne Mitglieder.",
    moderator: "lead",
    welcome: {
      title: "Willkommen in der Pilotgruppe Barrierefreiheit",
      body:
        "Danke, dass du die Plattform mit uns verbessern möchtest. Diese Gruppe ist verborgen; Mitglieder werden vom Team eingeladen.\n\n" +
        "Gesprächsimpuls: Wo bist du bei der Bedienung gestolpert – zum Beispiel mit Screenreader, Vergrösserung oder an Tagen mit wenig Energie?\n\n" +
        "Bitte keine Gesundheitsdaten in Rückmeldungen. Es geht nur um die Bedienung.\n\n" +
        "Team Moderationsleitung",
    },
  },
];

const PLATFORM_WELCOME = {
  title: "Willkommen in der Community",
  body:
    "Grüezi und willkommen. Hier tauschen sich Erwachsene mit MS aus der Deutschschweiz aus.\n\n" +
    "Ein paar Hinweise zum Start:\n" +
    "- Alle Beiträge hier sehen nur angemeldete Mitglieder.\n" +
    "- In den betreuten Gruppen findest du Austausch zu einzelnen Themen.\n" +
    "- Erfahrungen sind wertvoll, ersetzen aber keine medizinische Beratung.\n" +
    "- Mit «Melden» erreichst du das Moderationsteam.\n\n" +
    "Gesprächsimpuls: Worüber möchtest du dich hier gerne austauschen?\n\n" +
    "Team Moderation",
};

export async function seedCommunity(ctx: SeedContext): Promise<void> {
  const { db, staff, members } = ctx;

  // Themen
  for (const [i, t] of TOPICS.entries()) {
    await db
      .insert(s.topics)
      .values({ slug: t.slug, name: t.name, description: t.description, sort: (i + 1) * 10 })
      .onConflictDoNothing({ target: s.topics.slug });
  }
  const topicRows = await db.select({ id: s.topics.id, slug: s.topics.slug }).from(s.topics);
  const topicId = (slug: string) => {
    const t = topicRows.find((r) => r.slug === slug);
    if (!t) throw new Error(`Thema fehlt: ${slug}`);
    return t.id;
  };

  const now = new Date();
  const ensureMembership = async (groupId: string, accountId: string, status: "active" | "requested", rulesVersion: string) => {
    await db
      .insert(s.groupMemberships)
      .values({
        groupId,
        accountId,
        status,
        rulesVersionAccepted: rulesVersion,
        decidedAt: status === "active" ? now : null,
        decidedBy: status === "active" ? staff.lead : null,
      })
      .onConflictDoNothing({ target: [s.groupMemberships.groupId, s.groupMemberships.accountId] });
  };

  const ensurePost = async (authorId: string, groupId: string | null, topic: string, title: string, body: string) => {
    const [existing] = await db
      .select({ id: s.posts.id })
      .from(s.posts)
      .where(
        and(
          eq(s.posts.authorId, authorId),
          eq(s.posts.title, title),
          groupId ? eq(s.posts.groupId, groupId) : isNull(s.posts.groupId),
        ),
      )
      .limit(1);
    if (!existing) await db.insert(s.posts).values({ authorId, groupId, topicId: topicId(topic), title, body });
  };

  const groupIds: Record<string, string> = {};
  for (const g of GROUPS) {
    const rules = [...BASE_RULES, ...(g.extraRule ? [g.extraRule] : [])].map((r, i) => `${i + 1}. ${r}`).join("\n");
    const rulesVersion = "1";
    const moderatorId = g.moderator === "lead" ? staff.lead : staff.moderator;
    await db
      .insert(s.groups)
      .values({
        slug: g.slug,
        title: g.title,
        description: g.description,
        topicId: topicId(g.topic),
        type: g.type,
        discoverable: g.type === "open" ? true : g.discoverable,
        rules,
        rulesVersion,
        moderatorAccountId: moderatorId,
        createdBy: staff.admin,
      })
      .onConflictDoNothing({ target: s.groups.slug });
    const [row] = await db
      .select({ id: s.groups.id, rulesVersion: s.groups.rulesVersion })
      .from(s.groups)
      .where(eq(s.groups.slug, g.slug));
    groupIds[g.slug] = row.id;

    // Verantwortliche Moderation ist aktives Mitglied, damit der Gruppenraum betreut werden kann.
    await ensureMembership(row.id, moderatorId, "active", row.rulesVersion);
    await ensurePost(moderatorId, row.id, g.topic, g.welcome.title, g.welcome.body);
  }

  await ensurePost(staff.moderator, null, "neu-mit-ms", PLATFORM_WELCOME.title, PLATFORM_WELCOME.body);

  // Fiktive Demo-Mitglieder (PRD 16) treten Gruppen bei – ohne erfundene Beiträge.
  const [a, b, c] = members;
  const v = "1";
  if (a) {
    await ensureMembership(groupIds["kennenlernen-neu-mit-ms"], a.id, "active", v);
    await ensureMembership(groupIds["beruf-und-arbeit"], a.id, "active", v);
  }
  if (b) {
    await ensureMembership(groupIds["kennenlernen-neu-mit-ms"], b.id, "active", v);
    // Ausstehende Anfrage für die Gruppenverwaltung (S55) – B sieht keine Inhalte (AT04).
    await ensureMembership(groupIds["familie-und-partnerschaft"], b.id, "requested", v);
  }
  if (c) {
    await ensureMembership(groupIds["alltag-und-energie"], c.id, "active", v);
    await ensureMembership(groupIds["pilotgruppe-barrierefreiheit"], c.id, "active", v);
  }
}
