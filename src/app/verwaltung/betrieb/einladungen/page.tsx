import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ActionButton } from "@/components/admin/action-button";
import { CreateInvitationForm } from "@/components/admin/invitation-forms";
import { OpsSubNav } from "@/components/admin/ops-nav";
import { param, query } from "@/components/admin/params";
import { AdminEmpty, AdminSectionBlock, DateTime, MoreLink, StatGrid, StatTile } from "@/components/admin/ui";
import { Badge, Notice, PageHeader, PageSkeleton, Table, type Tone } from "@/components/ui/primitives";
import { requireStaff } from "@/server/auth/viewer";
import { isEnabled } from "@/server/flags";
import {
  INVITE_MAX_USES,
  INVITE_VALIDITY_DAYS,
  invitationSummary,
  listInvitations,
  type InvitationStatus,
} from "@/server/modules/account/invitations";
import { revokeInvitationAction } from "@/server/modules/admin/invitation-actions";
import { OPS_ROLES } from "@/server/modules/admin/ops";

export const metadata: Metadata = { title: "Einladungen" };

/**
 * S60 Teil Einladungen (PRD 17 «begrenzte Einladung», D06): Codes erzeugen, widerrufen und
 * auflisten. Die Liste zeigt nur Zweck, Kontingent, Fristen und Status – keine Codes und keine
 * Konten, die einen Code eingelöst haben.
 */
export default function InvitationsPage({ searchParams }: PageProps<"/verwaltung/betrieb/einladungen">) {
  return (
    <Suspense fallback={<PageSkeleton rows={4} />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

const STATUS: Record<InvitationStatus, { label: string; tone: Tone }> = {
  active: { label: "Gültig", tone: "success" },
  exhausted: { label: "Ausgeschöpft", tone: "neutral" },
  expired: { label: "Abgelaufen", tone: "outline" },
  revoked: { label: "Widerrufen", tone: "outline" },
};

async function Content({ searchParams }: { searchParams: PageProps<"/verwaltung/betrieb/einladungen">["searchParams"] }) {
  await requireStaff([...OPS_ROLES]);
  const sp = await searchParams;
  const raw = param(sp.vor);
  const cursor = raw && !Number.isNaN(Date.parse(raw)) ? new Date(raw) : null;
  const [inviteOnly, registrationOpen, summary, list] = await Promise.all([
    isEnabled("registration_invite_only"),
    isEnabled("registration"),
    invitationSummary(),
    listInvitations(cursor),
  ]);

  return (
    <div>
      <PageHeader
        eyebrow="Betrieb"
        title="Einladungen"
        description="Begrenzte Einladung vor und während des Pilots: Codes mit Zweck, Kontingent und Ablauf. Gespeichert wird nur ein Hash; eingelöste Codes sind keinem Konto zugeordnet."
      />
      <div className="flex flex-col gap-10">
        <OpsSubNav active="einladungen" />

        {!registrationOpen ? (
          <Notice tone="warning" title="Registrierungen sind abgeschaltet">
            Solange der Schalter «Registrierung» aus ist, kann sich niemand registrieren – auch nicht mit Code.
          </Notice>
        ) : inviteOnly ? (
          <Notice tone="info" title="Registrierung nur mit Einladungscode">
            Neue Konten entstehen nur mit einem gültigen Code. Ungültige Codes erhalten eine neutrale Meldung; Versuche sind je Verbindung gedrosselt.
          </Notice>
        ) : (
          <Notice tone="warning" title="Einladungspflicht ist ausgeschaltet">
            Im Moment kann sich jede Person ohne Code registrieren. Für die begrenzte Einladung den Schalter «Nur mit Einladungscode» unter{" "}
            <Link href="/verwaltung/betrieb#schalter" className="font-semibold underline underline-offset-4">
              Status und Schalter
            </Link>{" "}
            einschalten.
          </Notice>
        )}

        <StatGrid cols={3}>
          <StatTile label="Gültige Codes" value={summary.active} icon="check-circle" />
          <StatTile label="Freie Plätze" value={summary.openSeats} icon="users" hint="Summe der offenen Kontingente gültiger Codes" />
          <StatTile label="Einlösungen (30 Tage)" value={summary.redeemed30d} icon="activity" hint="Nur gezählt, keinem Konto zugeordnet" />
        </StatGrid>

        <AdminSectionBlock
          id="neu"
          title="Code erzeugen"
          description="Eine Pilotgruppe wird nur mit verfügbarer Moderation aufgenommen (PRD 17). Der Code erscheint genau einmal."
        >
          <CreateInvitationForm maxUsesOptions={INVITE_MAX_USES} dayOptions={INVITE_VALIDITY_DAYS} />
        </AdminSectionBlock>

        <AdminSectionBlock id="liste" title="Erzeugte Codes" description="Neueste zuerst. Angezeigt werden nur die letzten vier Zeichen zur Wiedererkennung.">
          {list.items.length === 0 ? (
            <AdminEmpty icon="mail" title="Noch keine Einladungscodes">
              Erzeuge oben einen Code für den Mitarbeitendentest oder eine Pilotgruppe.
            </AdminEmpty>
          ) : (
            <Table>
              <caption className="sr-only">Einladungscodes mit Status und Kontingent</caption>
              <thead>
                <tr>
                  <th scope="col">Zweck</th>
                  <th scope="col">Endet auf</th>
                  <th scope="col">Eingelöst</th>
                  <th scope="col">Gültig bis</th>
                  <th scope="col">Zuletzt eingelöst</th>
                  <th scope="col">Status</th>
                  <th scope="col">
                    <span className="sr-only">Aktion</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.items.map((r) => (
                  <tr key={r.id}>
                    <th scope="row" className="bg-surface! font-sans! text-base! font-semibold! normal-case! tracking-normal! text-ink!">
                      {r.purpose}
                      <span className="block text-sm font-normal text-ink-2">
                        Erzeugt <DateTime date={r.createdAt} />
                      </span>
                    </th>
                    <td className="font-mono tabular">…{r.codeHint}</td>
                    <td className="tabular">
                      {r.usedCount} von {r.maxUses}
                    </td>
                    <td className="whitespace-nowrap">
                      <DateTime date={r.expiresAt} />
                    </td>
                    <td className="whitespace-nowrap">{r.lastRedeemedAt ? <DateTime date={r.lastRedeemedAt} /> : "–"}</td>
                    <td>
                      <Badge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Badge>
                    </td>
                    <td>
                      {!r.revokedAt && (
                        <ActionButton
                          action={revokeInvitationAction}
                          fields={{ invitationId: r.id }}
                          label="Widerrufen"
                          variant="quiet-danger"
                          pendingText="Wird widerrufen …"
                          confirm={{
                            title: "Code widerrufen?",
                            body: `Der Code für «${r.purpose}» (endet auf ${r.codeHint}) kann danach nicht mehr eingelöst werden. Bestehende Konten bleiben unverändert.`,
                            confirmLabel: "Code widerrufen",
                            variant: "danger",
                          }}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
          <MoreLink href={list.next ? query("/verwaltung/betrieb/einladungen", { vor: list.next }) : null} />
        </AdminSectionBlock>
      </div>
    </div>
  );
}
