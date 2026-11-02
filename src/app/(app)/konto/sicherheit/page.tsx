import type { Metadata } from "next";
import QRCode from "qrcode";
import { Suspense } from "react";
import { AccountNav } from "@/components/account/account-nav";
import { ActionButton } from "@/components/account/action-button";
import { ReauthNotice } from "@/components/account/reauth-notice";
import { Icon } from "@/components/ui/icon";
import { Badge, Card, Notice, PageHeader, PageSkeleton, SectionHeader } from "@/components/ui/primitives";
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
      <div className="flex flex-col gap-6">
        <PageHeader
          eyebrow="Einstellungen"
          title="Zwei-Faktor-Anmeldung"
          description="Zusätzlich zum Passwort fragt die Anmeldung nach einem Code aus einer Authenticator-App auf deinem Smartphone."
          className="pb-0 sm:pb-0"
        />
        <AccountNav current="sicherheit" />
      </div>

      {sp.mfa === "pflicht" && !mfa.enabled && (
        <Notice tone="warning" role="alert" title="Für Mitarbeitende ist der zweite Faktor Pflicht">
          Ohne bestätigten zweiten Faktor ist kein Zugang zur Verwaltung möglich. Richte ihn hier ein und melde dich danach
          erneut in der Verwaltung an.
        </Notice>
      )}

      {mfa.enabled ? (
        <>
          <section aria-labelledby="status-title" className="flex max-w-2xl flex-col gap-4">
            <SectionHeader id="status-title" title="Status" className="mb-0" />
            <Card className="flex flex-col gap-3">
              <p className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                <Badge tone="success" icon="shield-check">Eingeschaltet</Badge>
                {mfa.confirmedAt && <span className="text-sm font-normal text-ink-2">seit {formatDateTime(mfa.confirmedAt, tz)}</span>}
              </p>
              <p className="text-base text-ink-2">
                {mfa.unusedRecoveryCodes === 1
                  ? "Ein Wiederherstellungscode ist noch unbenutzt."
                  : `${mfa.unusedRecoveryCodes} Wiederherstellungscodes sind noch unbenutzt.`}
                {mfa.unusedRecoveryCodes <= 3 && " Erstelle bei Bedarf neue Codes."}
              </p>
            </Card>
          </section>

          <section aria-labelledby="codes-title" className="flex max-w-2xl flex-col gap-4">
            <SectionHeader
              id="codes-title"
              title="Wiederherstellungscodes"
              description="Damit meldest du dich an, wenn dein Smartphone nicht verfügbar ist. Jeder Code gilt einmal."
              className="mb-0"
            />
            {recent ? <RegenerateCodes /> : <ReauthNotice next="/konto/sicherheit" />}
          </section>

          <section aria-labelledby="off-title" className="flex max-w-2xl flex-col gap-4">
            <SectionHeader id="off-title" title="Zweiten Faktor ausschalten" className="mb-0" />
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
          </section>
        </>
      ) : setup ? (
        <section aria-labelledby="setup-title" className="flex flex-col gap-6">
          <SectionHeader
            id="setup-title"
            title="Einrichtung in zwei Schritten"
            description="Du brauchst eine Authenticator-App, zum Beispiel die vorinstallierte Passwort-App deines Smartphones."
            className="mb-0"
          />
          <ol className="grid gap-6 lg:grid-cols-2">
            <li>
              <Card className="flex h-full flex-col gap-4">
                <p className="font-semibold text-ink">1 · QR-Code scannen</p>
                <div className="w-fit rounded-[12px] border border-line bg-surface p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={setup.svg} alt="QR-Code zum Einrichten der Authenticator-App" width={208} height={208} className="size-52" />
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-semibold text-ink-2">Scannen nicht möglich? Schlüssel manuell eingeben:</p>
                  <p className="tabular break-all font-mono text-lg tracking-[0.08em] text-ink" aria-label={`Schlüssel: ${setup.key.split("").join(" ")}`}>
                    {setup.key}
                  </p>
                  <p className="text-sm text-ink-2">Zeitbasiert (TOTP), 6 Ziffern, 30 Sekunden.</p>
                </div>
              </Card>
            </li>
            <li>
              <Card className="flex h-full flex-col gap-4">
                <p className="font-semibold text-ink">2 · Code bestätigen</p>
                {recent ? <MfaConfirmForm /> : <ReauthNotice next="/konto/sicherheit" />}
              </Card>
            </li>
          </ol>
          <ActionButton action={cancelMfaSetupAction} variant="ghost" pendingText="Wird abgebrochen …">
            Einrichtung abbrechen
          </ActionButton>
        </section>
      ) : (
        <section aria-labelledby="start-title" className="flex max-w-2xl flex-col gap-5">
          <SectionHeader id="start-title" title="Noch nicht eingeschaltet" className="mb-0" />
          <ul className="flex flex-col gap-3 text-base text-ink-2">
            <li className="flex gap-3">
              <Icon name="check" className="mt-1 size-5 shrink-0 text-ink" />
              Schützt dein Konto, auch wenn jemand dein Passwort kennt.
            </li>
            <li className="flex gap-3">
              <Icon name="check" className="mt-1 size-5 shrink-0 text-ink" />
              Du erhältst zehn Wiederherstellungscodes für den Notfall.
            </li>
            <li className="flex gap-3">
              <Icon name="check" className="mt-1 size-5 shrink-0 text-ink" />
              {viewer.isStaff ? "Für Mitarbeitende Pflicht." : "Für Mitglieder freiwillig und jederzeit wieder ausschaltbar."}
            </li>
          </ul>
          {recent ? (
            <ActionButton action={startMfaSetupAction} variant="primary" size="lg" pendingText="Wird vorbereitet …" reauthNext="/konto/sicherheit">
              Einrichtung starten
            </ActionButton>
          ) : (
            <ReauthNotice next="/konto/sicherheit" />
          )}
        </section>
      )}
    </div>
  );
}
