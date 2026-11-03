/** Gemeinsame Hilfen und Typen für den Inhalts-Seed. Teil des Startbestands (CON08), siehe scripts/seed/content/run.ts. */

export const DAY = 86400_000;
export const now = new Date();
export const daysAgo = (n: number) => new Date(now.getTime() - n * DAY);
export const addMonths = (d: Date, m: number) => {
  const x = new Date(d);
  x.setUTCMonth(x.getUTCMonth() + m);
  return x;
};

export const RETRIEVED = "abgerufen am 2. November 2026";
export const LINK_ONLY = "Verweis auf die Quelle, kein übernommener Text";

export type Src = { title: string; publisher: string; url: string; publishedOn?: string };

export type SeedArticle = {
  slug: string;
  topic: string;
  title: string;
  summary: string;
  body: string;
  minutes: number;
  medical: boolean;
  specialty: string;
  sources: Src[];
};

export type SeedOffer = {
  slug: string;
  organization: string;
  title: string;
  summary: string;
  description: string;
  topics: string[];
  cantons: string[];
  languages: string[];
  audience: string;
  responsibility: string;
  access: string;
  costNote?: string;
  contactWay: string;
  url: string;
};

export const NEURO = "Neurologie (Demo-Prüfung)";
export const SOZIAL = "Sozialversicherungsrecht (Demo-Prüfung)";
export const PSY = "Psychiatrie und Psychotherapie (Demo-Prüfung)";
