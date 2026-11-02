import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Notice } from "@/components/ui/primitives";

/** Hinweis vor sensiblen Aktionen (ACC07, PRI03–PRI05): Bestätigung mit Passwort, 10 Minuten gültig. */
export function ReauthNotice({ next, children }: { next: string; children?: React.ReactNode }) {
  return (
    <Notice
      tone="neutral"
      icon="lock"
      title="Zu deinem Schutz bestätigen"
      action={
        <ButtonLink href={`/konto/bestaetigen?next=${encodeURIComponent(next)}`} variant="secondary" icon={<Icon name="key" className="size-5" />}>
          Mit Passwort bestätigen
        </ButtonLink>
      }
    >
      {children ?? "Für diese Aktion fragen wir dein Passwort erneut ab. Die Bestätigung gilt danach 10 Minuten."}
    </Notice>
  );
}
