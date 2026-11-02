import { Badge, Notice, SegmentNav, type Tone } from "@/components/ui/primitives";
import { ARTICLE_STATUS_LABEL, OFFER_STATUS_LABEL, type ArticleStatus, type OfferStatus } from "@/server/modules/content/shared";

/** Statusbadges – Status nie nur über Farbe, immer mit Text (DESIGN Regel 5). */
const ARTICLE_TONE: Record<ArticleStatus, Tone> = {
  draft: "neutral",
  in_review: "info",
  changes_requested: "warning",
  approved: "accent",
  published: "success",
  withdrawn: "danger",
  archived: "outline",
};

export function ArticleStatusBadge({ status }: { status: ArticleStatus }) {
  return <Badge tone={ARTICLE_TONE[status]}>{ARTICLE_STATUS_LABEL[status]}</Badge>;
}

const OFFER_TONE: Record<OfferStatus, Tone> = {
  draft: "neutral",
  in_review: "info",
  published: "success",
  hidden: "warning",
  expired: "danger",
};

export function OfferStatusBadge({ status }: { status: OfferStatus }) {
  return <Badge tone={OFFER_TONE[status]}>{OFFER_STATUS_LABEL[status]}</Badge>;
}

export function DueBadge({ state }: { state: "overdue" | "due_soon" | "ok" | "unverified" | "live" | "none" | "withdrawn" }) {
  switch (state) {
    case "overdue":
      return <Badge tone="danger" icon="alert">Prüfung überfällig</Badge>;
    case "due_soon":
      return <Badge tone="warning" icon="clock">Bald fällig</Badge>;
    case "unverified":
      return <Badge tone="outline">Nicht geprüft</Badge>;
    case "withdrawn":
      return <Badge tone="danger">Zurückgezogen</Badge>;
    case "none":
      return <Badge tone="outline">Nicht publiziert</Badge>;
    default:
      return <Badge tone="success" icon="check">Aktuell</Badge>;
  }
}

/** Bestätigung nach Weiterleitung – erscheint erst, nachdem der Server gespeichert hat (HOM07). */
export function StatusNotice({ code, messages }: { code: string | undefined; messages: Record<string, string> }) {
  const text = code ? messages[code] : undefined;
  if (!text) return null;
  return <Notice tone="success" role="status" title={text} />;
}

export function RedaktionNav({ active, counts }: { active: string; counts?: Partial<Record<string, number>> }) {
  const items = [
    { href: "/verwaltung/redaktion", key: "artikel", label: "Artikel" },
    { href: "/verwaltung/redaktion?ansicht=faellig", key: "faellig", label: "Überfällig und bald fällig" },
    { href: "/verwaltung/redaktion/pruefung", key: "pruefung", label: "Prüfvorrat" },
    { href: "/verwaltung/redaktion/hinweise", key: "hinweise", label: "Hinweise" },
    { href: "/verwaltung/redaktion/mein-moment", key: "moment", label: "Mein Moment" },
  ];
  return (
    <SegmentNav
      label="Redaktion"
      items={items.map((i) => ({ href: i.href, label: i.label, active: i.key === active, count: counts?.[i.key] }))}
    />
  );
}

export function VerzeichnisNav({ active, counts }: { active: string; counts?: Partial<Record<string, number>> }) {
  const items = [
    { href: "/verwaltung/verzeichnis", key: "angebote", label: "Angebote" },
    { href: "/verwaltung/verzeichnis?ansicht=arbeitsvorrat", key: "arbeitsvorrat", label: "Arbeitsvorrat" },
    { href: "/verwaltung/verzeichnis?ansicht=hinweise", key: "hinweise", label: "Hinweise" },
    { href: "/verwaltung/verzeichnis/sicherheit", key: "sicherheit", label: "Sicherheitskontakte" },
  ];
  return (
    <SegmentNav
      label="Verzeichnis"
      items={items.map((i) => ({ href: i.href, label: i.label, active: i.key === active, count: counts?.[i.key] }))}
    />
  );
}

export const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Datum als «YYYY-MM-DD» für date-Felder (lokaler Kalendertag in Zürich). */
export function dateInputValue(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Zurich", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}
