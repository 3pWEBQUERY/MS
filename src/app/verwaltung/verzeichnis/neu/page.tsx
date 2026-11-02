import type { Metadata } from "next";
import { Suspense } from "react";
import { OfferForm } from "@/components/content/admin/directory-forms";
import { Notice, PageHeader, PageSkeleton } from "@/components/ui/primitives";
import { requireStaff } from "@/server/auth/viewer";
import { EDITOR_ROLES } from "@/server/modules/content/staff";

export const metadata: Metadata = { title: "Angebot anlegen" };

/** S57: neues Angebot als Entwurf. Öffentlich erst nach Prüfung und Publikation (CON05). */
export default function NewOfferPage() {
  return (
    <Suspense fallback={<PageSkeleton rows={4} />}>
      <NewOffer />
    </Suspense>
  );
}

async function NewOffer() {
  await requireStaff(EDITOR_ROLES);
  return (
    <>
      <PageHeader back={{ href: "/verwaltung/verzeichnis", label: "Verzeichnis" }} eyebrow="Verzeichnis" title="Angebot anlegen" />
      <div className="flex flex-col gap-8">
        <Notice tone="info" title="Nur reale, geprüfte Angebote">
          Keine erfundenen Partner, Fachpersonen oder Leistungszusagen (CON08). Nach dem Anlegen erfasst du die Prüfung beim Anbieter und
          publizierst danach.
        </Notice>
        <OfferForm
          defaults={{
            slug: "",
            organization: "",
            title: "",
            summary: "",
            description: "",
            topicSlugs: [],
            cantons: ["CH"],
            languages: ["de"],
            audience: "",
            responsibility: "",
            access: "",
            costNote: "Kosten gemäss Anbieter",
            contactWay: "",
            url: "",
          }}
        />
      </div>
    </>
  );
}
