import type { Metadata } from "next";
import { Suspense } from "react";
import { ReauthNotice } from "@/components/account/reauth-notice";
import { ActionButton } from "@/components/account/action-button";
import { SettingsHeader, SettingsSection, SettingsSections } from "@/components/account/settings-layout";
import { Button } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icon";
import { Badge, IndexList, IndexRow, Notice, PageSkeleton } from "@/components/ui/primitives";
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
      <SettingsHeader
        current="konto"
        title="Konto"
        description="Deine Anmeldedaten und Geräte. Diese Angaben sieht niemand aus der Community."
      />

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

      <SettingsSections>
        <SettingsSection
          id="email-title"
          index="01"
          title="E-Mail-Adresse"
          description="Für Anmeldung, Sicherheitshinweise und Belege. Eine neue Adresse gilt erst nach ihrer Bestätigung."
        >
          <p className="flex items-center gap-3 border-y border-line py-4">
            <Icon name="mail" className="size-5 shrink-0 text-ink-2" />
            <span className="min-w-0 break-all text-lg font-semibold text-ink">{account?.email}</span>
          </p>
          {recent ? (
            <ChangeEmailForm />
          ) : (
            <ReauthNotice next="/konto">Um die E-Mail-Adresse zu ändern, bestätige zuerst dein Passwort.</ReauthNotice>
          )}
        </SettingsSection>

        <SettingsSection
          id="password-title"
          index="02"
          title="Passwort"
          description="Nach der Änderung werden alle anderen Geräte abgemeldet und du erhältst einen Sicherheitshinweis."
        >
          {recent ? (
            <ChangePasswordForm />
          ) : (
            <ReauthNotice next="/konto">Um dein Passwort zu ändern, bestätige zuerst dein aktuelles Passwort.</ReauthNotice>
          )}
        </SettingsSection>

        <SettingsSection
          id="sessions-title"
          index="03"
          title="Angemeldete Geräte"
          description="Beendete Sitzungen werden beim nächsten Zugriff des Geräts abgemeldet."
          wide
        >
          <ul className="border-t border-line">
            {sessionList.map((s) => (
              <li
                key={s.id}
                className="flex flex-col gap-3 border-b border-line py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
              >
                <div className="flex min-w-0 items-start gap-4">
                  <Icon name={DEVICE_ICON[s.deviceType] ?? "monitor"} className="mt-0.5 size-5 shrink-0 text-ink-2" />
                  <div className="flex min-w-0 flex-col gap-1">
                    <p className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                      {s.deviceType}
                      {s.browser ? ` · ${s.browser}` : ""}
                      {s.current && (
                        <Badge tone="success" icon="check">
                          Dieses Gerät
                        </Badge>
                      )}
                    </p>
                    <p className="text-sm text-ink-2">
                      Zuletzt genutzt {s.current ? "gerade eben" : formatRelative(s.lastUsedAt)} · Angemeldet seit{" "}
                      <span className="tabular">{formatDateTime(s.createdAt, tz)}</span>
                    </p>
                  </div>
                </div>
                {!s.current && (
                  <ActionButton
                    action={revokeSessionAction}
                    fields={{ sessionId: s.id }}
                    variant="quiet-danger"
                    size="sm"
                    pendingText="Wird beendet …"
                    className="flex shrink-0 flex-col items-start gap-3 pl-9 sm:items-end sm:pl-0"
                  >
                    Sitzung beenden
                  </ActionButton>
                )}
              </li>
            ))}
          </ul>
          {others > 0 && (
            <ActionButton action={revokeOtherSessionsAction} variant="secondary" pendingText="Wird abgemeldet …">
              Alle anderen Geräte abmelden
            </ActionButton>
          )}
        </SettingsSection>

        <SettingsSection id="more-title" index="04" title="Sicherheit und Abmeldung" wide>
          <IndexList>
            <IndexRow href="/konto/sicherheit" title="Zwei-Faktor-Anmeldung">
              {viewer.mfaEnabled ? "Eingeschaltet" : "Optional – zusätzlicher Schutz mit einer App"}
            </IndexRow>
          </IndexList>
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <p className="max-w-md text-base text-ink-2">Beendet die Sitzung auf diesem Gerät. Ungespeicherte Eingaben gehen verloren.</p>
            <form action={logoutAction}>
              <Button type="submit" variant="secondary" icon={<Icon name="logout" className="size-5" />}>
                Abmelden
              </Button>
            </form>
          </div>
        </SettingsSection>
      </SettingsSections>
    </div>
  );
}
