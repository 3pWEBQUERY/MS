import type { Metadata } from "next";
import { Suspense } from "react";
import { StatusAction } from "@/components/content/admin/action-form";
import { MomentRuleForm } from "@/components/content/admin/moment-form";
import { one, RedaktionNav, StatusNotice } from "@/components/content/admin/common";
import { Badge, Notice, PageHeader, PageSkeleton, SectionHeader, Table } from "@/components/ui/primitives";
import { DEFAULT_MOMENT_CONFIG, MOMENT_INTENTS } from "@/lib/moment";
import { formatDateTime } from "@/lib/time";
import { requireStaff } from "@/server/auth/viewer";
import { activateMomentVersionAction } from "@/server/modules/content/moment-actions";
import { listMomentVersions, parseMomentConfig } from "@/server/modules/content/moment";
import { EDITOR_ROLES } from "@/server/modules/content/staff";

export const metadata: Metadata = { title: "Mein Moment – Regeln" };

/** HOM02: versionierte redaktionelle Regelkonfiguration für «Mein Moment». Genau eine Version ist aktiv. */
export default function MomentRulesPage({ searchParams }: PageProps<"/verwaltung/redaktion/mein-moment">) {
  return (
    <Suspense fallback={<PageSkeleton rows={3} />}>
      <MomentRules searchParams={searchParams} />
    </Suspense>
  );
}

async function MomentRules({ searchParams }: { searchParams: PageProps<"/verwaltung/redaktion/mein-moment">["searchParams"] }) {
  const viewer = await requireStaff(EDITOR_ROLES);
  const sp = await searchParams;
  const rows = await listMomentVersions();
  const active = rows.find((r) => r.active);
  const base = (active && parseMomentConfig(active.config)) || DEFAULT_MOMENT_CONFIG;

  return (
    <>
      <PageHeader
        eyebrow="Redaktion"
        title="Mein Moment – Regeln"
        description="Welche höchstens drei Ziele erscheinen nach «Etwas festhalten», «Austausch finden» und «Wissen oder Hilfe finden». Ohne Tagebuch, Profilanalyse oder Bewertung."
      />
      <div className="flex flex-col gap-10">
        <RedaktionNav roles={viewer.roles} active="moment" />
        <StatusNotice
          code={one(sp.status)}
          messages={{ angelegt: "Neue Version angelegt. Aktiviere sie, damit sie auf «Heute» gilt.", aktiviert: "Version aktiviert. Sie gilt ab sofort." }}
        />
        {!active && (
          <Notice tone="info" title="Keine aktive Version">
            Es gilt die Standardfassung aus dem Code, bis eine Version aktiviert wird.
          </Notice>
        )}
        <section aria-labelledby="versionen">
          <SectionHeader id="versionen" title="Versionen" />
          {rows.length === 0 ? (
            <p className="text-base text-ink-2">Noch keine Version angelegt.</p>
          ) : (
            <Table>
              <caption className="sr-only">Versionen der Mein-Moment-Regeln</caption>
              <thead>
                <tr>
                  <th scope="col">Version</th>
                  <th scope="col">Ziele</th>
                  <th scope="col">Status</th>
                  <th scope="col">Aktion</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const cfg = parseMomentConfig(r.config);
                  return (
                    <tr key={r.id}>
                      <td className="min-w-48">
                        <span className="font-semibold">{r.versionLabel}</span>
                        <span className="block text-sm text-ink-2">angelegt {formatDateTime(r.createdAt)}</span>
                      </td>
                      <td className="min-w-64 text-sm">
                        {cfg
                          ? MOMENT_INTENTS.map((i) => (
                              <span key={i.key} className="block">
                                {i.label}: {cfg[i.key].map((t) => t.label).join(", ") || "–"}
                              </span>
                            ))
                          : "Ungültige Konfiguration"}
                      </td>
                      <td>
                        {r.active ? (
                          <Badge tone="success" icon="check">
                            Aktiv seit {r.publishedAt ? formatDateTime(r.publishedAt) : "–"}
                          </Badge>
                        ) : (
                          <Badge tone="outline">Inaktiv</Badge>
                        )}
                      </td>
                      <td>
                        {!r.active && cfg && (
                          <StatusAction action={activateMomentVersionAction} fields={{ ruleId: r.id }} label="Aktivieren" size="sm" pendingText="Wird aktiviert …" />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </section>
        <section aria-labelledby="neu">
          <SectionHeader id="neu" title="Neue Version anlegen" description="Vorbelegt mit der aktiven Fassung. Die neue Version gilt erst nach der Aktivierung." />
          <MomentRuleForm base={base} />
        </section>
      </div>
    </>
  );
}
