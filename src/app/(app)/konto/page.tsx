import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AccountNav } from "@/components/account/account-nav";
import { ReauthNotice } from "@/components/account/reauth-notice";
import { ActionButton } from "@/components/account/action-button";
import { Button } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icon";
import { Badge, Card, Notice, PageHeader, PageSkeleton, SectionHeader } from "@/components/ui/primitives";
import { formatDateTime, formatRelative, localTimeString } from "@/lib/time";
import { hasRecentAuth, REAUTH_WINDOW_MS, requireViewer } from "@/server/auth/viewer";
import { logoutAction } from "@/server/modules/account/auth-actions";
import { revokeOtherSessionsAction, revokeSessionAction } from "@/server/modules/account/settings-actions";
import { getOwnAccount, listOwnSessions } from "@/server/modules/account/settings";
import { ChangeEmailForm, ChangePasswordForm } from "./account-forms";

export const metadata: Metadata = { title: "Konto", robots: { index: false } };

/** S11 Kontoeinstellungen (ACC07, ACC08): E-Mail, Passwort, Sitzungen, Abmelden. */
export default function AccountPage({ searchParams }: PageProps<"/konto">) {
  return (
    <Suspense fallback={<PageSkeleton rows={4} />}>
      <Account searchParams={searchParams} />
    </Suspense>
  );
}

const DEVICE_ICON: Record<string, IconName> = { Smartphone: "smartphone", Tablet: "tablet", Computer: "monitor" };

async function Account({ searchParams }: { searchParams: PageProps<"/konto">["searchParams"] }) {
  const viewer = await requireViewer();
  const sp = await searchParams;
  const [account, sessionList] = await Promise.all([getOwnAccount(viewer), listOwnSessions(viewer)]);
  const tz = viewer.prefs.timezone;
  const recent = hasRecentAuth(viewer);
  const reauthUntil = recent && viewer.reauthAt ? new Date(viewer.reauthAt.getTime() + REAUTH_WINDOW_MS) : null;
  const others = sessionList.filter((s) => !s.current).length;

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-6">
        <PageHeader
          eyebrow="Einstellungen"
          title="Konto"
          description="Deine Anmeldedaten und Geräte. Diese Angaben sieht niemand aus der Community."
          className="pb-0 sm:pb-0"
        />
        <AccountNav current="konto" />
      </div>

      {sp.email === "geaendert" && (
        <Notice tone="success" role="status" title="E-Mail-Adresse geändert">
          Deine neue Adresse ist bestätigt. An die bisherige Adresse haben wir einen Sicherheitshinweis gesendet.
        </Notice>
      )}

      {reauthUntil && (
        <Notice tone="neutral" icon="shield-check">
          Du hast dich bestätigt. Änderungen an E-Mail und Passwort sind bis {localTimeString(reauthUntil, tz)} Uhr möglich.
        </Notice>
      )}

      <section aria-labelledby="email-title" className="flex max-w-2xl flex-col gap-4">
        <SectionHeader
          id="email-title"
          title="E-Mail-Adresse"
          description="Für Anmeldung, Sicherheitshinweise und Belege. Eine neue Adresse gilt erst nach ihrer Bestätigung."
          className="mb-0"
        />
        <Card tone="sunk" className="flex items-center gap-3">
          <Icon name="mail" className="size-5 shrink-0 text-ink-2" />
          <span className="break-all font-medium text-ink">{account?.email}</span>
        </Card>
        {recent ? <ChangeEmailForm /> : <ReauthNotice next="/konto">Um die E-Mail-Adresse zu ändern, bestätige zuerst dein Passwort.</ReauthNotice>}
      </section>

      <section aria-labelledby="password-title" className="flex max-w-2xl flex-col gap-4">
        <SectionHeader
          id="password-title"
          title="Passwort"
          description="Nach der Änderung werden alle anderen Geräte abgemeldet und du erhältst einen Sicherheitshinweis."
          className="mb-0"
        />
        {recent ? <ChangePasswordForm /> : <ReauthNotice next="/konto">Um dein Passwort zu ändern, bestätige zuerst dein aktuelles Passwort.</ReauthNotice>}
      </section>

      <section aria-labelledby="sessions-title" className="flex flex-col gap-4">
        <SectionHeader
          id="sessions-title"
          title="Angemeldete Geräte"
          description="Beendete Sitzungen werden beim nächsten Zugriff des Geräts abgemeldet."
          className="mb-0"
        />
        <ul className="flex flex-col gap-3">
          {sessionList.map((s) => (
            <li key={s.id}>
              <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-sunk text-ink-2">
                    <Icon name={DEVICE_ICON[s.deviceType] ?? "monitor"} className="size-5" />
                  </span>
                  <div className="flex flex-col gap-1">
                    <p className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                      {s.deviceType}
                      {s.browser ? ` · ${s.browser}` : ""}
                      {s.current && <Badge tone="success" icon="check">Dieses Gerät</Badge>}
                    </p>
                    <p className="text-sm text-ink-2">
                      Zuletzt genutzt {s.current ? "gerade eben" : formatRelative(s.lastUsedAt)} · Angemeldet seit{" "}
                      {formatDateTime(s.createdAt, tz)}
                    </p>
                  </div>
                </div>
                {!s.current && (
                  <ActionButton action={revokeSessionAction} fields={{ sessionId: s.id }} variant="quiet-danger" size="sm" pendingText="Wird beendet …">
                    Sitzung beenden
                  </ActionButton>
                )}
              </Card>
            </li>
          ))}
        </ul>
        {others > 0 && (
          <ActionButton action={revokeOtherSessionsAction} variant="secondary" pendingText="Wird abgemeldet …">
            Alle anderen Geräte abmelden
          </ActionButton>
        )}
      </section>

      <section aria-labelledby="more-title" className="flex flex-col gap-4">
        <SectionHeader id="more-title" title="Sicherheit und Abmeldung" className="mb-0" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/konto/sicherheit"
            className="flex items-start gap-4 rounded-[20px] border border-line bg-surface p-5 transition-colors hover:border-line-2 hover:bg-raised"
          >
            <Icon name="shield-check" className="mt-0.5 size-6 shrink-0 text-ink" />
            <span className="flex flex-col gap-1">
              <span className="font-semibold text-ink">Zwei-Faktor-Anmeldung</span>
              <span className="text-sm text-ink-2">{viewer.mfaEnabled ? "Eingeschaltet" : "Optional – zusätzlicher Schutz mit einer App"}</span>
            </span>
          </Link>
          <Card className="flex flex-col items-start gap-3">
            <p className="text-sm text-ink-2">Beendet die Sitzung auf diesem Gerät. Ungespeicherte Eingaben gehen verloren.</p>
            <form action={logoutAction}>
              <Button type="submit" variant="secondary" icon={<Icon name="logout" className="size-5" />}>
                Abmelden
              </Button>
            </form>
          </Card>
        </div>
      </section>
    </div>
  );
}
