import "server-only";
import { sql as dsql } from "drizzle-orm";
import { db } from "../../db";

/**
 * Volltextsuche für Wissen und Hilfe (CON07, S45). Öffentliche Bereiche; die Rechtefilter
 * (publiziert, Prüftermin gültig) gelten in derselben Abfrage vor Trefferzahl und Ausschnitt.
 * Suchbegriffe werden weder geloggt noch gespeichert.
 */
export type SearchHit = { id: string; href: string; title: string; meta: string; snippet: string };
export type SearchSection = { total: number; items: SearchHit[] };

/** Markierungen im Ausschnitt; werden in der Oberfläche als <mark> dargestellt, nie als HTML. */
export const HL_START = "\u0002";
export const HL_STOP = "\u0003";
const HEADLINE_OPTS = `StartSel=${HL_START}, StopSel=${HL_STOP}, MaxWords=30, MinWords=12, ShortWord=3, MaxFragments=1, HighlightAll=false`;

export function normalizeQuery(q: string | string[] | undefined): string {
  const v = Array.isArray(q) ? q[0] : q;
  return (v ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function likePattern(q: string) {
  return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

export async function searchKnowledge(q: string, limit = 10): Promise<SearchSection> {
  if (q.length < 2) return { total: 0, items: [] };
  const rows = (await db.execute(dsql`
    with query as (select websearch_to_tsquery('german', ${q}) as tsq)
    select a.id, a.slug, v.title, t.name as topic,
      ts_headline('german', regexp_replace(v.summary || ' ' || v.body, '(^|\n)(### |## |- )', '\\1', 'g'), query.tsq, ${HEADLINE_OPTS}) as snippet,
      count(*) over() as total
    from content.articles a
    join content.article_versions v on v.id = a.published_version_id
    join content.knowledge_topics t on t.id = a.topic_id
    cross join query
    where v.status = 'published' and v.review_due_at > now()
      and (to_tsvector('german', v.title || ' ' || v.summary || ' ' || v.body) @@ query.tsq
           or v.title ilike ${likePattern(q)})
    order by (v.title ilike ${likePattern(q)}) desc,
      ts_rank(to_tsvector('german', v.title || ' ' || v.summary || ' ' || v.body), query.tsq) desc, v.title
    limit ${limit}
  `)) as unknown as { id: string; slug: string; title: string; topic: string; snippet: string; total: string | number }[];
  return {
    total: Number(rows[0]?.total ?? 0),
    items: rows.map((r) => ({ id: r.id, href: `/wissen/${r.slug}`, title: r.title, meta: r.topic, snippet: r.snippet })),
  };
}

export async function searchOffers(q: string, limit = 10): Promise<SearchSection> {
  if (q.length < 2) return { total: 0, items: [] };
  const rows = (await db.execute(dsql`
    with query as (select websearch_to_tsquery('german', ${q}) as tsq)
    select o.id, o.slug, o.title, o.organization,
      ts_headline('german', o.summary || ' ' || o.description, query.tsq, ${HEADLINE_OPTS}) as snippet,
      count(*) over() as total
    from content.support_offers o
    cross join query
    where o.status = 'published' and o.next_review_at > now()
      and (to_tsvector('german', o.organization || ' ' || o.title || ' ' || o.summary || ' ' || o.description) @@ query.tsq
           or o.title ilike ${likePattern(q)} or o.organization ilike ${likePattern(q)})
    order by (o.title ilike ${likePattern(q)} or o.organization ilike ${likePattern(q)}) desc,
      ts_rank(to_tsvector('german', o.organization || ' ' || o.title || ' ' || o.summary || ' ' || o.description), query.tsq) desc, o.title
    limit ${limit}
  `)) as unknown as { id: string; slug: string; title: string; organization: string; snippet: string; total: string | number }[];
  return {
    total: Number(rows[0]?.total ?? 0),
    items: rows.map((r) => ({ id: r.id, href: `/hilfe/${r.slug}`, title: r.title, meta: r.organization, snippet: r.snippet })),
  };
}
