import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PageHeader, PageSkeleton } from "@/components/ui/primitives";
import { requireViewer } from "@/server/auth/viewer";
import { getOwnProfile } from "@/server/modules/account/profile";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Mein Profil", robots: { index: false } };

/** S09 Eigenes Profil (ACC06, COM05, US12): Vorschau entspricht der Sicht anderer Mitglieder (S10). */
export default function ProfilePage() {
  return (
    <Suspense fallback={<PageSkeleton rows={2} />}>
      <Profile />
    </Suspense>
  );
}

async function Profile() {
  const viewer = await requireViewer();
  const profile = await getOwnProfile(viewer);
  if (!profile) redirect("/willkommen");
  return (
    <div className="flex flex-col">
      <PageHeader
        eyebrow="Profil"
        title="Mein Profil"
        description="Ein sparsames Profil: Pseudonym, freiwillige Interessen und auf Wunsch dein Kanton. Keine Biografie, kein Bild, keine Gesundheitsangaben."
      />
      <ProfileForm
        profile={{
          pseudonym: profile.pseudonym,
          interests: profile.interests,
          canton: profile.canton,
          discoverable: profile.discoverable,
          version: profile.version,
        }}
      />
    </div>
  );
}
