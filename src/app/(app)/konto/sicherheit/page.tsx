import type { Metadata } from "next";
import QRCode from "qrcode";
import { Suspense } from "react";
import { ActionButton } from "@/components/account/action-button";
import { ReauthNotice } from "@/components/account/reauth-notice";
import { SettingsHeader, SettingsSection, SettingsSections } from "@/components/account/settings-layout";
import { Icon } from "@/components/ui/icon";
import { Badge, Notice, PageSkeleton } from "@/components/ui/primitives";
import { formatDateTime } from "@/lib/time";
import { otpauthUri } from "@/server/auth/totp";
import { hasRecentAuth, requireViewer } from "@/server/auth/viewer";
import { decrypt } from "@/server/crypto";
import { cancelMfaSetupAction, startMfaSetupAction } from "@/server/modules/account/mfa-actions";
import { getMfaState } from "@/server/modules/account/settings";
import { DisableMfaForm, MfaConfirmForm, RegenerateCodes } from "./mfa-forms";

export const metadata: Metadata = { title: "Sicherheit", robots: { index: false } };

/** Zweiter Faktor (ACC05): optional für Mitglieder, Pflicht für Mitarbeitende. */
export default function SecurityPage({ searchParams }: PageProps<"/konto/sicherheit">) {
  return (
    <Suspense fallback={<PageSkeleton rows={2} />}>
      <Security searchParams={searchParams} />
    </Suspense>
  );
}

async function Security({ searchParams }: { searchParams: PageProps<"/konto/sicherheit">["searchParams"] }) {
  const viewer = await requireViewer();
  const sp = await searchParams;
  const mfa = await getMfaState(viewer);
  const recent = hasRecentAuth(viewer);
  const tz = viewer.prefs.timezone;

  let setup: { svg: string; key: string } | null = null;
  if (!mfa.enabled && mfa.pending) {
    // QR-Code serverseitig erzeugt; das Geheimnis verlässt den Server nur in dieser Ansicht.
    const secret = decrypt(mfa.pending.secretEncrypted);
    const svg = await QRCode.toString(otpauthUri(secret, viewer.pseudonym ?? "Konto"), {
      type: "svg",
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#000000", light: "#ffffff" },
    });
    setup = { svg: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`, key: secret.match(/.{1,4}/g)?.join(" ") ?? secret };
  }

  return (
    <div className="flex flex-col gap-10">
      <SettingsHeader
        current="sicherheit"
        title="Zwei-Faktor-Anmeldung"
        description="Zusätzlich zum Passwort fragt die Anmeldung nach einem Code aus einer Authenticator-App auf deinem Smartphone."
      />

      {sp.mfa === "pflicht" && !mfa.enabled && (
        <Notice tone="warning" role="alert" title="Für Mitarbeitende ist der zweite Faktor Pflicht">
          Ohne bestätigten zweiten Faktor ist kein Zugang zur Verwaltung möglich. Richte ihn hier ein und melde dich danach
          erneut in der Verwaltung an.
        </Notice>
      )}

      {mfa.enabled ? (
        <SettingsSections>
          <SettingsSection id="status-title" index="01" title="Status">
            <p className="flex flex-wrap items-center gap-3 border-y border-line py-4 font-semibold text-ink">
              <Badge tone="success" icon="shield-check">
                Eingeschaltet
              </Badge>
              {mfa.confirmedAt && <span className="text-sm font-normal text-ink-2">seit {formatDateTime(mfa.confirmedAt, tz)}</span>}
            </p>
            <p className="flex items-baseline gap-4 text-base text-ink-2">
              <span aria-hidden="true" className="tabular font-display text-[2rem] leading-none text-ink">
                {mfa.unusedRecoveryCodes}
              </span>
              <span>
                {mfa.unusedRecoveryCodes === 1
                  ? "Ein Wiederherstellungscode ist noch unbenutzt."
                  : `${mfa.unusedRecoveryCodes} Wiederherstellungscodes sind noch unbenutzt.`}
                {mfa.unusedRecoveryCodes <= 3 && " Erstelle bei Bedarf neue Codes."}
              </span>
            </p>
          </SettingsSection>

          <SettingsSection
            id="codes-title"
            index="02"
            title="Wiederherstellungscodes"
            description="Damit meldest du dich an, wenn dein Smartphone nicht verfügbar ist. Jeder Code gilt einmal."
          >
            {recent ? <RegenerateCodes /> : <ReauthNotice next="/konto/sicherheit" />}
          </SettingsSection>

          <SettingsSection id="off-title" index="03" title="Zweiten Faktor ausschalten" tone="danger">
            {viewer.isStaff ? (
              <Notice tone="neutral" icon="lock">
                Für Mitarbeitende ist der zweite Faktor Pflicht. Bei Verlust des Geräts hilft der geprüfte Supportprozess der
                Administration – nie allein über eine Profilangabe.
              </Notice>
            ) : recent ? (
              <DisableMfaForm />
            ) : (
              <ReauthNotice next="/konto/sicherheit" />
            )}
          </SettingsSection>
        </SettingsSections>
      ) : setup ? (
        <section aria-labelledby="setup-title" className="flex flex-col gap-8">
          <div className="flex max-w-2xl flex-col gap-2.5">
            <h2 id="setup-title" className="display-sm">
              Einrichtung in zwei Schritten
            </h2>
            <p className="text-base text-ink-2">
              Du brauchst eine Authenticator-App, zum Beispiel die vorinstallierte Passwort-App deines Smartphones.
            </p>
          </div>
          <ol className="grid border-t border-ink lg:grid-cols-2">
            <li className="flex flex-col gap-5 border-b border-line py-8 lg:border-b-0 lg:border-r lg:pr-10">
              <p className="flex items-baseline gap-3 font-display text-[1.5rem] leading-tight tracking-[-0.015em] text-ink">
                <span className="font-mono text-sm tracking-[0.08em] text-accent-ink">1</span> · QR-Code scannen
              </p>
              <div className="w-fit rounded-[20px] border border-line bg-surface p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={setup.svg}
                  alt="QR-Code zum Einrichten der Authenticator-App"
                  width={208}
                  height={208}
                  className="size-52 rounded-[12px]"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <p className="text-sm font-semibold text-ink-2">Scannen nicht möglich? Schlüssel manuell eingeben:</p>
                <p
                  className="tabular break-all font-mono text-lg tracking-[0.08em] text-ink"
                  aria-label={`Schlüssel: ${setup.key.split("").join(" ")}`}
                >
                  {setup.key}
                </p>
                <p className="text-sm text-ink-2">Zeitbasiert (TOTP), 6 Ziffern, 30 Sekunden.</p>
              </div>
            </li>
            <li className="flex flex-col gap-5 py-8 lg:pl-10">
              <p className="flex items-baseline gap-3 font-display text-[1.5rem] leading-tight tracking-[-0.015em] text-ink">
                <span className="font-mono text-sm tracking-[0.08em] text-accent-ink">2</span> · Code bestätigen
              </p>
              {recent ? <MfaConfirmForm /> : <ReauthNotice next="/konto/sicherheit" />}
            </li>
          </ol>
          <div className="border-t border-line pt-6">
            <ActionButton action={cancelMfaSetupAction} variant="ghost" pendingText="Wird abgebrochen …">
              Einrichtung abbrechen
            </ActionButton>
          </div>
        </section>
      ) : (
        <SettingsSections>
          <SettingsSection id="start-title" index="01" title="Noch nicht eingeschaltet">
            <ul className="flex flex-col border-t border-line text-base text-ink">
              <li className="flex gap-4 border-b border-line py-4">
                <Icon name="check" className="mt-1 size-5 shrink-0 text-accent-ink" />
                Schützt dein Konto, auch wenn jemand dein Passwort kennt.
              </li>
              <li className="flex gap-4 border-b border-line py-4">
                <Icon name="check" className="mt-1 size-5 shrink-0 text-accent-ink" />
                Du erhältst zehn Wiederherstellungscodes für den Notfall.
              </li>
              <li className="flex gap-4 border-b border-line py-4">
                <Icon name="check" className="mt-1 size-5 shrink-0 text-accent-ink" />
                {viewer.isStaff ? "Für Mitarbeitende Pflicht." : "Für Mitglieder freiwillig und jederzeit wieder ausschaltbar."}
              </li>
            </ul>
            {recent ? (
              <ActionButton
                action={startMfaSetupAction}
                variant="primary"
                size="lg"
                pendingText="Wird vorbereitet …"
                reauthNext="/konto/sicherheit"
              >
                Einrichtung starten
              </ActionButton>
            ) : (
              <ReauthNotice next="/konto/sicherheit" />
            )}
          </SettingsSection>
        </SettingsSections>
      )}
    </div>
  );
}
