import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ACCOUNT_STATUS_LABEL, ACCOUNT_STATUS_TONE } from "@/components/admin/labels";
import { param } from "@/components/admin/params";
import { AdminSectionBlock, DateTime, FilterForm, PlainInput, ShortId } from "@/components/admin/ui";
import { Badge, EmptyState, Notice, PageHeader, PageSkeleton, Table } from "@/components/ui/primitives";
import { requireStaff } from "@/server/auth/viewer";
import { searchMembers } from "@/server/modules/admin/members";

export const metadata: Metadata = { title: "Mitglieder" };

/** S54 Mitgliederverwaltung (ACC08): begrenzte Suche nach Pseudonym oder exakter Konto-ID. */
export default function MembersPage({ searchParams }: PageProps<"/verwaltung/mitglieder">) {
  return (
    <Suspense fallback={<PageSkeleton rows={2} />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/verwaltung/mitglieder">["searchParams"] }) {
  const viewer = await requireStaff(["moderation_lead", "admin"]);
  const sp = await searchParams;
  const q = param(sp.q).slice(0, 60);
  const result = q ? await searchMembers(viewer, q) : { rows: [], tooShort: false };

  return (
    <div>
      <PageHeader
        eyebrow="Mitglieder"
        title="Mitgliederverwaltung"
        description="Kontostatus, Sanktionen und zugehörige Fälle. Suche nur nach Pseudonym oder exakter Konto-ID, höchstens 20 Treffer."
      />
      <div className="flex flex-col gap-8">
        <Notice tone="neutral" title="Getrennte Rechte" icon="lock">
          Tagebuch, Nachrichten und Gesundheitsdaten sind hier nicht zugänglich – auch nicht für die Administration. Jede Suche und jede
          Einsicht wird protokolliert.
        </Notice>

        <div role="search" aria-label="Mitglieder suchen">
          <FilterForm action="/verwaltung/mitglieder">
            <PlainInput
              id="q"
              name="q"
              label="Pseudonym oder Konto-ID"
              defaultValue={q}
              hint="Mindestens 2 Zeichen. E-Mail-Adressen werden nicht durchsucht."
            />
          </FilterForm>
        </div>

        {q && (
          <AdminSectionBlock id="treffer" title="Treffer" description={result.rows.length === 20 ? "Es werden höchstens 20 Treffer angezeigt. Bitte die Suche präzisieren." : undefined}>
            {result.tooShort ? (
              <p className="text-ink-2">Bitte gib mindestens 2 Zeichen ein.</p>
            ) : result.rows.length === 0 ? (
              <EmptyState icon="search" title="Keine Treffer">
                Prüfe die Schreibweise des Pseudonyms oder verwende die vollständige Konto-ID.
              </EmptyState>
            ) : (
              <Table>
                <caption className="sr-only">Suchtreffer</caption>
                <thead>
                  <tr>
                    <th scope="col">Pseudonym</th>
                    <th scope="col">Kontostatus</th>
                    <th scope="col">Konto-ID</th>
                    <th scope="col">Registriert</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <Link href={`/verwaltung/mitglieder/${m.id}`} className="font-semibold text-ink underline underline-offset-4">
                          {m.pseudonym}
                        </Link>
                      </td>
                      <td>
                        <Badge tone={ACCOUNT_STATUS_TONE[m.status]}>{ACCOUNT_STATUS_LABEL[m.status]}</Badge>
                      </td>
                      <td>
                        <ShortId id={m.id} />
                      </td>
                      <td className="text-sm">
                        <DateTime date={m.createdAt} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </AdminSectionBlock>
        )}
      </div>
    </div>
  );
}
