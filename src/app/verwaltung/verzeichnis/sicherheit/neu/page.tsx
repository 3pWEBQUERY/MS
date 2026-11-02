import type { Metadata } from "next";
import { Suspense } from "react";
import { SafetyContactForm } from "@/components/content/admin/directory-forms";
import { Notice, PageHeader, PageSkeleton } from "@/components/ui/primitives";
import { requireStaff } from "@/server/auth/viewer";
import { EDITOR_ROLES } from "@/server/modules/content/staff";

export const metadata: Metadata = { title: "Hilfeweg anlegen" };

export default function NewSafetyContactPage() {
  return (
    <Suspense fallback={<PageSkeleton rows={3} />}>
      <NewSafetyContact />
    </Suspense>
  );
}

async function NewSafetyContact() {
  await requireStaff(EDITOR_ROLES);
  return (
    <>
      <PageHeader back={{ href: "/verwaltung/verzeichnis/sicherheit", label: "Sicherheitskontakte" }} eyebrow="Verzeichnis" title="Hilfeweg anlegen" />
      <div className="flex flex-col gap-8">
        <Notice tone="warning" title="Nur verifizierte Kontaktwege">
          Ein neuer Hilfeweg ist zunächst inaktiv. Er erscheint erst nach fachlicher Verifikation und Aktivierung auf der Sicherheitsseite.
        </Notice>
        <SafetyContactForm defaults={{ name: "", description: "", phone: "", url: "", availability: "", region: "Ganze Schweiz", sort: 100 }} />
      </div>
    </>
  );
}
