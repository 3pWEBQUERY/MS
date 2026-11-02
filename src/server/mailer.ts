import "server-only";
import nodemailer from "nodemailer";
import { env } from "./env";

/**
 * Transaktionsmails mit neutralen Vorlagen (MSG07): keine Diagnose, keine Gruppen-,
 * Artikel- oder Nachrichtentexte. Ohne SMTP-Konfiguration wird in der Entwicklung nur
 * der Link protokolliert.
 */
export type MailTemplate =
  | { kind: "verify_email"; link: string }
  | { kind: "password_reset"; link: string }
  | { kind: "email_change_confirm"; link: string }
  | { kind: "security_notice"; what: "email_changed" | "password_changed" | "mfa_changed" | "new_login" }
  | { kind: "social_digest"; count: number; link: string }
  | { kind: "deletion_receipt"; receipt: string };

const SIGNATURE = "\n\n—\nMS Plattform · Diese Nachricht wurde automatisch versendet.\nAkute Hilfe: Notruf 144";

function render(t: MailTemplate): { subject: string; text: string } {
  switch (t.kind) {
    case "verify_email":
      return {
        subject: "Bitte bestätige deine E-Mail-Adresse",
        text: `Hallo\n\nBitte bestätige deine E-Mail-Adresse über diesen Link. Er ist 24 Stunden gültig und nur einmal verwendbar:\n\n${t.link}\n\nWenn du dich nicht registriert hast, kannst du diese Nachricht ignorieren.${SIGNATURE}`,
      };
    case "password_reset":
      return {
        subject: "Passwort zurücksetzen",
        text: `Hallo\n\nÜber diesen Link kannst du ein neues Passwort festlegen. Er ist 30 Minuten gültig:\n\n${t.link}\n\nWenn du das nicht angefordert hast, musst du nichts tun.${SIGNATURE}`,
      };
    case "email_change_confirm":
      return {
        subject: "Neue E-Mail-Adresse bestätigen",
        text: `Hallo\n\nBitte bestätige deine neue E-Mail-Adresse:\n\n${t.link}${SIGNATURE}`,
      };
    case "security_notice": {
      const what = {
        email_changed: "Die E-Mail-Adresse deines Kontos wurde geändert.",
        password_changed: "Das Passwort deines Kontos wurde geändert.",
        mfa_changed: "Die Zwei-Faktor-Anmeldung deines Kontos wurde geändert.",
        new_login: "Es gab eine neue Anmeldung in deinem Konto.",
      }[t.what];
      return {
        subject: "Sicherheitshinweis zu deinem Konto",
        text: `Hallo\n\n${what}\n\nWarst du das nicht? Melde dich an, beende alle Sitzungen und setze dein Passwort zurück.${SIGNATURE}`,
      };
    }
    case "social_digest":
      return {
        subject: "Neue Hinweise auf der Plattform",
        text: `Hallo\n\nEs gibt ${t.count === 1 ? "einen neuen Hinweis" : `${t.count} neue Hinweise`} für dich. Details siehst du nach der Anmeldung:\n\n${t.link}\n\nDu kannst E-Mail-Hinweise jederzeit in den Einstellungen abschalten.${SIGNATURE}`,
      };
    case "deletion_receipt":
      return {
        subject: "Bestätigung deiner Kontolöschung",
        text: `Hallo\n\nDein Konto wurde deaktiviert und die Löschung ist abgeschlossen. Beleg: ${t.receipt}\n\nLetzte Sicherungskopien werden gemäss Datenschutzinformation spätestens nach 65 Tagen entfernt.${SIGNATURE}`,
      };
  }
}

let transport: ReturnType<typeof nodemailer.createTransport> | null = null;

export async function sendMail(to: string, template: MailTemplate): Promise<void> {
  const { subject, text } = render(template);
  if (!env.mail.host()) {
    if (!env.isProd) {
      const link = "link" in template ? template.link : "";
      console.info(`[mail:dev] ${template.kind} → ${link || subject}`);
      return;
    }
    throw new Error("SMTP ist nicht konfiguriert");
  }
  transport ??= nodemailer.createTransport({
    host: env.mail.host(),
    port: env.mail.port(),
    secure: env.mail.port() === 465,
    auth: env.mail.user() ? { user: env.mail.user(), pass: env.mail.pass() } : undefined,
  });
  await transport.sendMail({ from: env.mail.from(), to, subject, text });
}
