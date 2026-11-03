import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { StatusAction } from "@/components/content/admin/action-form";
import { DueBadge, OfferStatusBadge, one, StatusNotice, VerzeichnisNav } from "@/components/content/admin/common";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { AdminEmpty, LedgerItem, LedgerList } from "@/components/admin/ui";
import { Badge, PageHeader, PageSkeleton, PlainText, Table } from "@/components/ui/primitives";
import { cantonName } from "@/lib/catalog";
import { formatDate, formatDateTime } from "@/lib/time";
import { requireStaff } from "@/server/auth/viewer";
import { decrypt, decryptOptional } from "@/server/crypto";
import { closeContactMessageAction } from "@/server/modules/content/directory-actions";
import { listOffersForStaff, offerDueState } from "@/server/modules/content/directory-queries";
import { listContactMessages } from "@/server/modules/content/editorial-queries";
import { EDITOR_ROLES } from "@/server/modules/content/staff";

export const metadata: Metadata = { title: "Verzeichnis" };

/** S57 Verzeichnisverwaltung (CON05): Angebote, Ablaufdaten, Änderungsflag-Arbeitsvorrat, Hinweise. */
export default function DirectoryPage({ searchParams }: PageProps<"/verwaltung/verzeichnis">) {
  return (
    <Suspense fallback={<PageSkeleton rows={4} />}>
      <Directory searchParams={searchParams} />
    </Suspense>
  );
}

async function Directory({ searchParams }: { searchParams: PageProps<"/verwaltung/verzeichnis">["searchParams"] }) {
  const viewer = await requireStaff(EDITOR_ROLES);
  const sp = await searchParams;
  await connection();
  const view = one(sp.ansicht) === "arbeitsvorrat" ? "arbeitsvorrat" : one(sp.ansicht) === "hinweise" ? "hinweise" : "angebote";
  const [offers, messages] = await Promise.all([listOffersForStaff(), listContactMessages(viewer)]);
  const now = new Date();
  const rows = offers.map((o) => ({ ...o, due: offerDueState(o, now) }));
  const backlog = rows.filter((o) => o.changeFlag || o.status === "expired" || (o.status === "published" && o.due !== "ok") || o.due === "unverified");
  const offerHints = messages.filter((m) => m.refType === "offer" || m.category === "angebot");
  const titles = new Map(offers.map((o) => [o.id, `${o.title} – ${o.organization}`]));
  const published = rows.filter((o) => o.status === "published").length;
  const list = view === "arbeitsvorrat" ? backlog : rows;

  return (
    <>
      <PageHeader
        eyebrow="Verwaltung"
        title="Verzeichnis"
        description={`Hilfsangebote prüfen, publizieren und aktuell halten. ${published} von ${rows.length} Angeboten sind publiziert.`}
        actions={
          <ButtonLink href="/verwaltung/verzeichnis/neu" icon={<Icon name="plus" className="size-5" />}>
            Angebot anlegen
          </ButtonLink>
        }
      />
      <div className="flex flex-col gap-8">
        <VerzeichnisNav active={view} counts={{ arbeitsvorrat: backlog.length, hinweise: offerHints.length }} />
        <StatusNotice code={one(sp.status)} messages={{ erledigt: "Hinweis als erledigt markiert." }} />

        {view === "hinweise" ? (
          offerHints.length === 0 ? (
            <AdminEmpty icon="mail" title="Keine offenen Hinweise zu Angeboten" />
          ) : (
            <LedgerList as="ul">
              {offerHints.map((m) => {
                let text = "";
                let reply: string | null = null;
                try {
                  text = decrypt(m.messageEncrypted);
                  reply = decryptOptional(m.replyEmailEncrypted);
                } catch {
                  text = "Dieser Hinweis kann nicht entschlüsselt werden.";
                }
                return (
                  <LedgerItem key={m.id}>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-ink-2">
                        <span>{formatDateTime(m.createdAt)}</span>
                        {m.refId && titles.has(m.refId) && (
                          <Link href={`/verwaltung/verzeichnis/${m.refId}`} className="font-semibold text-ink underline underline-offset-4">
                            {titles.get(m.refId)}
                          </Link>
                        )}
                      </div>
                      <PlainText text={text} className="border-l-2 border-line-2 pl-4 text-base text-ink" />
                      <p className="text-sm text-ink-2">{reply ? `Antwortadresse: ${reply}` : "Keine Antwortadresse angegeben."}</p>
                      <div>
                        <StatusAction action={closeContactMessageAction} fields={{ messageId: m.id, back: "verzeichnis" }} label="Als erledigt markieren" size="sm" />
                      </div>
                  </LedgerItem>
                );
              })}
            </LedgerList>
          )
        ) : list.length === 0 ? (
          <AdminEmpty icon="check-circle" title={view === "arbeitsvorrat" ? "Arbeitsvorrat leer" : "Noch keine Angebote"}>
            {view === "arbeitsvorrat" ? "Alle publizierten Angebote sind geprüft und ohne offene Hinweise." : "Lege das erste Angebot an."}
          </AdminEmpty>
        ) : (
          <Table>
            <caption className="sr-only">Hilfsangebote mit Status und Prüftermin</caption>
            <thead>
              <tr>
                <th scope="col">Angebot</th>
                <th scope="col">Status</th>
                <th scope="col">Prüfung</th>
                <th scope="col">Hinweis</th>
              </tr>
            </thead>
            <tbody>
              {list.map((o) => (
                <tr key={o.id}>
                  <td className="min-w-64">
                    <Link href={`/verwaltung/verzeichnis/${o.id}`} className="link-quiet font-semibold text-ink">
                      {o.title}
                    </Link>
                    <span className="block text-sm text-ink-2">
                      {o.organization} · {o.cantons.map((c) => (c === "CH" ? "CH" : (cantonName(c) ?? c))).join(", ")}
                    </span>
                  </td>
                  <td>
                    <OfferStatusBadge status={o.status} />
                  </td>
                  <td className="whitespace-nowrap">
                    <span className="flex flex-col items-start gap-1">
                      <DueBadge state={o.due} />
                      {o.nextReviewAt && <span className="tabular text-sm text-ink-2">bis {formatDate(o.nextReviewAt)}</span>}
                    </span>
                  </td>
                  <td className="min-w-40 text-sm">{o.changeFlag ? <Badge tone="warning" icon="flag">{o.changeNote ?? "Prüfen"}</Badge> : "–"}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>
    </>
  );
}
