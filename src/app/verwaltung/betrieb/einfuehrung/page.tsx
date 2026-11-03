import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FLAG_LABEL } from "@/components/admin/labels";
import { OpsSubNav } from "@/components/admin/ops-nav";
import { AdminSectionBlock } from "@/components/admin/ui";
import { Badge, Notice, PageHeader, PageSkeleton, Table } from "@/components/ui/primitives";
import { requireStaff } from "@/server/auth/viewer";
import { listFlags, OPS_ROLES } from "@/server/modules/admin/ops";
import { START_INVENTORY_MIN, startInventory, stopSignals } from "@/server/modules/admin/rollout";

export const metadata: Metadata = { title: "Einführung und Stoppkriterien" };

/**
 * S60 Teil Einführung (PRD 17, CON08, HOM08): Startbestand vor Pilotstart, Stoppkriterien und
 * die Feature-Schalter als Rückfalloption. Nur Zähler, keine Inhalte oder Personendaten.
 */
export default function RolloutPage() {
  return (
    <Suspense fallback={<PageSkeleton rows={4} />}>
      <Content />
    </Suspense>
  );
}

const STEPS = [
  ["Mitarbeitendentest", "Nur fiktive Daten (SEED_DEMO), alle Kernabläufe F01–F07 durchgespielt, Restore geprobt."],
  ["Begrenzte Einladung", "Registrierung nur für eingeladene Personen; Moderation im Dienstplan verfügbar (D03)."],
  ["Geschlossener Pilot", "40–60 freiwillige Erwachsene, betreute Einführung, Nutzen- und Schutzreview (D06)."],
  ["Schrittweises Öffnen", "Pentest und festgelegte Releasekriterien bestanden; jeder Schritt mit verantwortlicher Freigabe."],
] as const;

function Check({ ok, okText = "Erfüllt", failText = "Offen" }: { ok: boolean; okText?: string; failText?: string }) {
  return (
    <Badge tone={ok ? "success" : "warning"} icon={ok ? "check-circle" : "alert"}>
      {ok ? okText : failText}
    </Badge>
  );
}

async function Content() {
  await requireStaff([...OPS_ROLES]);
  const [inv, signals, flags] = await Promise.all([startInventory(), stopSignals(), listFlags()]);
  const tripped = signals.filter((s) => s.tripped);
  const registration = flags.find((f) => f.key === "registration");

  const rows: { label: string; value: string; ok: boolean; hint: string }[] = [
    { label: "Geprüfte, publizierte Artikel", value: String(inv.articles), ok: inv.articles >= START_INVENTORY_MIN.articles, hint: `mindestens ${START_INVENTORY_MIN.articles}` },
    { label: "Medizinische Artikel ohne Fremdprüfung", value: String(inv.medicalWithoutReview), ok: inv.medicalWithoutReview === 0, hint: "muss 0 sein (CON01)" },
    { label: "Geprüfte Schweizer Hilfsangebote", value: String(inv.offers), ok: inv.offers >= START_INVENTORY_MIN.offers, hint: `mindestens ${START_INVENTORY_MIN.offers}` },
    {
      label: "Angebote ohne passende Fachprüfung",
      value: String(inv.offersWithoutExpert),
      ok: inv.offersWithoutExpert === 0,
      hint: "Recht/Finanzen bzw. Therapie (CON05)",
    },
    {
      label: "Finder-Themen ohne Angebot",
      value: inv.topicsWithoutOffer.length ? inv.topicsWithoutOffer.join(", ") : "keine",
      ok: inv.topicsWithoutOffer.length === 0,
      hint: "jede Themenkategorie braucht mindestens ein Angebot",
    },
    { label: "Aktive, betreute Gruppen", value: String(inv.groups), ok: inv.groups >= START_INVENTORY_MIN.groups, hint: `mindestens ${START_INVENTORY_MIN.groups}` },
    { label: "Gruppen ohne zuständige Moderation", value: String(inv.groupsWithoutModerator), ok: inv.groupsWithoutModerator === 0, hint: "verantwortete Gruppen" },
    { label: "Redaktion / medizinische Prüfung mit Rolle", value: `${inv.editors} / ${inv.reviewers}`, ok: inv.editors > 0 && inv.reviewers > 0, hint: "benannte Verantwortliche (D08)" },
    {
      label: "Hilfewege S49 mit Demo-Verifikation",
      value: `${inv.safetyDemoVerified} von ${inv.safetyActive}`,
      ok: inv.safetyActive > 0 && inv.safetyDemoVerified === 0,
      hint: "vor Pilot durch Krisenfachperson verifizieren (D03)",
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Betrieb"
        title="Einführung und Stoppkriterien"
        description="Startbestand vor Pilotstart, Signale für eine Pause neuer Einladungen und die Schalter für eine getrennte Aktivierung."
      />
      <div className="flex flex-col gap-10">
        <OpsSubNav active="einfuehrung" />

        {tripped.length > 0 ? (
          <Notice tone="danger" title="Stoppkriterium prüfen">
            {tripped.map((s) => s.label).join(", ")}. Neue Einladungen pausieren (Schalter «{FLAG_LABEL.registration ?? "Neue Registrierungen"}»), betroffene
            Funktion einschränken, Incidentprozess folgen. Wiederaufnahme erst nach Behebung und Retest.
          </Notice>
        ) : (
          <Notice tone="neutral" title="Keine technischen Stoppsignale">
            Die Signale ersetzen keine fachliche Beurteilung. Unzuverlässige Kontaktfreigabe wird über Meldungen und Tests (QA05) erkannt.
          </Notice>
        )}

        <AdminSectionBlock
          id="startbestand"
          title="Startbestand (CON08)"
          description="Vor Pilotstart erforderlich. Keine erfundenen Partner, Fachpersonen oder Angebotszusagen."
        >
          <Table>
            <caption className="sr-only">Startbestand vor Pilotstart</caption>
            <thead>
              <tr>
                <th scope="col">Kriterium</th>
                <th scope="col">Stand</th>
                <th scope="col">Vorgabe</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label}>
                  <th scope="row" className="bg-surface! text-base! font-semibold! text-ink!">
                    {r.label}
                  </th>
                  <td className="tabular">{r.value}</td>
                  <td className="text-sm text-ink-2">{r.hint}</td>
                  <td>
                    <Check ok={r.ok} />
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </AdminSectionBlock>

        <AdminSectionBlock id="stopp" title="Stoppkriterien (PRD 17)" description="Technische Hinweise; jede Pause hat eine verantwortliche Freigabe und eine dokumentierte Rückfalloption.">
          <Table>
            <caption className="sr-only">Stoppkriterien und aktuelle Signale</caption>
            <thead>
              <tr>
                <th scope="col">Kriterium</th>
                <th scope="col">Signal</th>
                <th scope="col">Status</th>
                <th scope="col">
                  <span className="sr-only">Bereich</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {signals.map((s) => (
                <tr key={s.key}>
                  <th scope="row" className="bg-surface! text-base! font-semibold! text-ink!">
                    {s.label}
                    <span className="block text-sm font-normal text-ink-2">{s.hint}</span>
                  </th>
                  <td className="tabular">{s.value}</td>
                  <td>
                    <Check ok={!s.tripped} okText="Unauffällig" failText="Prüfen" />
                  </td>
                  <td>
                    <Link href={s.href} className="text-sm font-semibold text-ink underline underline-offset-4">
                      Öffnen<span className="sr-only">: {s.label}</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </AdminSectionBlock>

        <AdminSectionBlock id="schritte" title="Rollout-Schritte" description="Feature-Schalter erlauben getrennte Aktivierung; eine Pilotgruppe wird nicht ohne verfügbare Moderation aufgenommen.">
          <ol className="grid gap-3 md:grid-cols-2">
            {STEPS.map(([title, text], i) => (
              <li key={title} className="flex flex-col gap-1 rounded-[16px] border border-line bg-surface p-4">
                <p className="font-semibold text-ink">
                  <span className="tabular text-ink-2">{i + 1}. </span>
                  {title}
                </p>
                <p className="text-sm text-ink-2">{text}</p>
              </li>
            ))}
          </ol>
          <p className="text-base text-ink-2">
            Neue Registrierungen sind derzeit{" "}
            <strong className="text-ink">{registration?.enabled === false ? "abgeschaltet" : "möglich"}</strong>. Schalter ändern unter{" "}
            <Link href="/verwaltung/betrieb#schalter" className="font-semibold text-ink underline underline-offset-4">
              Status und Schalter
            </Link>
            . Vorgehen bei Störungen: docs/RUNBOOKS.md.
          </p>
        </AdminSectionBlock>
      </div>
    </div>
  );
}
