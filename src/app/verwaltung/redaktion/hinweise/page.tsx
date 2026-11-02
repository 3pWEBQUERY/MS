import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { StatusAction } from "@/components/content/admin/action-form";
import { one, RedaktionNav, StatusNotice } from "@/components/content/admin/common";
import { Badge, Card, EmptyState, PageHeader, PageSkeleton, PlainText } from "@/components/ui/primitives";
import { formatDateTime } from "@/lib/time";
import { requireStaff } from "@/server/auth/viewer";
import { decrypt, decryptOptional } from "@/server/crypto";
import { closeContactMessageAction } from "@/server/modules/content/directory-actions";
import { listContactMessages } from "@/server/modules/content/editorial-queries";
import { contactCategoryLabel } from "@/server/modules/content/shared";

export const metadata: Metadata = { title: "Hinweise aus dem Kontaktformular" };

/** Eingang des Kontaktformulars (CON06). Datenschutzanliegen sehen nur Datenschutzstelle und Administration. */
export default function ContactInboxPage({ searchParams }: PageProps<"/verwaltung/redaktion/hinweise">) {
  return (
    <Suspense fallback={<PageSkeleton rows={3} />}>
      <ContactInbox searchParams={searchParams} />
    </Suspense>
  );
}

async function ContactInbox({ searchParams }: { searchParams: PageProps<"/verwaltung/redaktion/hinweise">["searchParams"] }) {
  const viewer = await requireStaff(["editor", "admin", "privacy_officer"]);
  const sp = await searchParams;
  const done = one(sp.ansicht) === "erledigt";
  let messages = await listContactMessages(viewer, { status: done ? "done" : "open" });
  // Datenschutzstelle ohne Redaktionsrolle sieht nur Datenschutzanliegen.
  if (!viewer.roles.some((r) => r === "editor" || r === "admin")) messages = messages.filter((m) => m.category === "datenschutz");
  return (
    <>
      <PageHeader
        eyebrow="Redaktion"
        title="Hinweise aus dem Kontaktformular"
        description="Fehlermeldungen zu Artikeln, Hinweise zu Angeboten, Barrieren und weitere Anliegen. Inhalte sind verschlüsselt gespeichert."
      />
      <div className="flex flex-col gap-8">
        <RedaktionNav active="hinweise" />
        <StatusNotice code={one(sp.status)} messages={{ erledigt: "Hinweis als erledigt markiert." }} />
        <p className="text-base">
          {done ? (
            <Link href="/verwaltung/redaktion/hinweise" className="font-semibold underline underline-offset-4">
              Offene Hinweise anzeigen
            </Link>
          ) : (
            <Link href="/verwaltung/redaktion/hinweise?ansicht=erledigt" className="font-semibold underline underline-offset-4">
              Erledigte Hinweise anzeigen
            </Link>
          )}
        </p>
        {messages.length === 0 ? (
          <EmptyState icon="mail" title={done ? "Keine erledigten Hinweise" : "Keine offenen Hinweise"} />
        ) : (
          <ul className="flex flex-col gap-3">
            {messages.map((m) => {
              let text = "";
              let reply: string | null = null;
              try {
                text = decrypt(m.messageEncrypted);
                reply = decryptOptional(m.replyEmailEncrypted);
              } catch {
                text = "Dieser Hinweis kann nicht entschlüsselt werden.";
              }
              return (
                <li key={m.id}>
                  <Card className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="neutral">{contactCategoryLabel(m.category)}</Badge>
                      <span className="text-sm text-ink-2">{formatDateTime(m.createdAt)}</span>
                      {m.refType === "article" && m.refId && (
                        <Link href={`/verwaltung/redaktion/artikel/${m.refId}`} className="text-sm font-semibold underline underline-offset-4">
                          Artikel öffnen
                        </Link>
                      )}
                      {m.refType === "offer" && m.refId && (
                        <Link href={`/verwaltung/verzeichnis/${m.refId}`} className="text-sm font-semibold underline underline-offset-4">
                          Angebot öffnen
                        </Link>
                      )}
                    </div>
                    <PlainText text={text} className="text-base text-ink" />
                    <p className="text-sm text-ink-2">{reply ? `Antwortadresse: ${reply}` : "Keine Antwortadresse angegeben."}</p>
                    {!done && (
                      <StatusAction action={closeContactMessageAction} fields={{ messageId: m.id, back: "redaktion" }} label="Als erledigt markieren" size="sm" />
                    )}
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
