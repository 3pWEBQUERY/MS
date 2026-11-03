import type { Metadata } from "next";
import { Suspense } from "react";
import { SettingsHeader } from "@/components/account/settings-layout";
import { NotificationPrefsForm, TestNotificationButton } from "@/components/messaging/notification-prefs-form";
import { PageSkeleton } from "@/components/ui/primitives";
import { localDateString } from "@/lib/time";
import { requireViewer } from "@/server/auth/viewer";
import { getNotificationPrefs, SOCIAL_TYPES } from "@/server/modules/messaging/notifications";

export const metadata: Metadata = { title: "Benachrichtigungen", robots: { index: false } };

/** S14 Benachrichtigungen einstellen (MSG07, US23): Kanal, Themen, Ruhezeit, Pause, Test ohne Inhaltsvorschau. */
export default function NotificationSettingsPage() {
  return (
    <Suspense fallback={<PageSkeleton rows={3} />}>
      <NotificationSettings />
    </Suspense>
  );
}

async function NotificationSettings() {
  const viewer = await requireViewer();
  const prefs = await getNotificationPrefs(viewer);

  return (
    <div className="flex flex-col gap-10">
      <SettingsHeader
        current="mitteilungen"
        title="Benachrichtigungen"
        description="Wähle, worüber du informiert werden möchtest. Hinweise nennen nie Inhalte, Namen oder Gesundheitsangaben."
      />
      <div className="flex max-w-2xl flex-col gap-10">
        <NotificationPrefsForm
          prefs={prefs}
          minDate={localDateString(new Date(), prefs.timezone)}
          types={SOCIAL_TYPES.map(([value, label, description]) => ({ value, label, description }))}
        />
        <section aria-labelledby="test-title" className="flex flex-col gap-4 border-t border-ink pt-8">
          <div className="flex flex-col gap-2">
            <h2 id="test-title" className="display-sm">
              Test ohne Inhaltsvorschau
            </h2>
            <p className="text-base text-ink-2">
              Legt einen neutralen Test-Hinweis in deinen Mitteilungen an. So siehst du, wie Hinweise aussehen – ohne Inhalte.
            </p>
          </div>
          <TestNotificationButton />
        </section>
      </div>
    </div>
  );
}
