import type { Metadata } from "next";
import { Suspense } from "react";
import { StatusAction } from "@/components/content/admin/action-form";
import { MediaUploader } from "@/components/content/admin/media-uploader";
import { one, StatusNotice } from "@/components/content/admin/common";
import { Card, EmptyState, Notice, PageHeader, PageSkeleton, SectionHeader } from "@/components/ui/primitives";
import { formatDate } from "@/lib/time";
import { requireStaff } from "@/server/auth/viewer";
import { mediaUrl } from "@/server/modules/content/articles";
import { deleteMediaAction } from "@/server/modules/content/media-actions";
import { formatBytes, listMedia } from "@/server/modules/content/media";
import { EDITOR_ROLES } from "@/server/modules/content/staff";
import { storageConfigured } from "@/server/storage";

export const metadata: Metadata = { title: "Medien" };

const UPLOAD_ERRORS: Record<string, string> = {
  type: "Nur JPEG-, PNG-, WebP- oder AVIF-Bilder sind erlaubt. SVG wird nicht angenommen.",
  size: "Das Bild ist grösser als 5 MB.",
  alt: "Bitte gib einen Alternativtext mit mindestens 3 Zeichen an.",
  empty: "Bitte wähle eine Bilddatei aus.",
  storage: "Die Objektablage ist gerade nicht erreichbar. Es wurde nichts gespeichert.",
  config: "Objektablage nicht konfiguriert (Railway Bucket verbinden).",
  forbidden: "Diese Aktion ist nicht möglich.",
  limit: "Zu viele Uploads in kurzer Zeit. Bitte warte etwas.",
};

/** Medienbibliothek (Railway Bucket): Bilder für Artikel, mit Pflicht-Alt-Text. */
export default function MediaPage({ searchParams }: PageProps<"/verwaltung/medien">) {
  return (
    <Suspense fallback={<PageSkeleton rows={3} />}>
      <Media searchParams={searchParams} />
    </Suspense>
  );
}

async function Media({ searchParams }: { searchParams: PageProps<"/verwaltung/medien">["searchParams"] }) {
  await requireStaff(EDITOR_ROLES);
  const sp = await searchParams;
  const configured = storageConfigured();
  const items = await listMedia();
  const upload = one(sp.upload);
  return (
    <>
      <PageHeader
        eyebrow="Verwaltung"
        title="Medien"
        description="Bilder für Wissensartikel. Jedes Bild braucht einen Alternativtext. Verwendete Bilder lassen sich nicht löschen."
      />
      <div className="flex flex-col gap-10">
        <StatusNotice code={upload === "ok" ? "ok" : one(sp.status)} messages={{ ok: "Bild hochgeladen.", geloescht: "Bild gelöscht." }} />
        {upload && upload !== "ok" && UPLOAD_ERRORS[upload] && <Notice tone="danger" role="alert" title={UPLOAD_ERRORS[upload]} />}
        {!configured ? (
          <Notice tone="warning" title="Objektablage nicht konfiguriert (Railway Bucket verbinden)">
            Ohne Bucket können keine Bilder hochgeladen oder ausgeliefert werden. Verbinde einen Railway Bucket mit den Variablen BUCKET,
            ENDPOINT, ACCESS_KEY_ID und SECRET_ACCESS_KEY.
          </Notice>
        ) : (
          <section aria-labelledby="hochladen">
            <SectionHeader id="hochladen" title="Bild hochladen" />
            <Card>
              <MediaUploader />
            </Card>
          </section>
        )}
        <section aria-labelledby="bibliothek">
          <SectionHeader id="bibliothek" title="Bibliothek" description={`${items.length} ${items.length === 1 ? "Bild" : "Bilder"}`} />
          {items.length === 0 ? (
            <EmptyState icon="image" title="Noch keine Bilder">
              Artikel funktionieren auch ohne Titelbild.
            </EmptyState>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((m) => (
                <li key={m.id} className="flex flex-col gap-3 rounded-[20px] border border-line bg-surface p-2">
                  <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-[12px] bg-sunk">
                    {configured ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={mediaUrl(m.objectKey)} alt={m.altText} className="size-full object-cover" loading="lazy" decoding="async" />
                    ) : (
                      <span className="text-sm text-ink-2">Vorschau nicht verfügbar</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 px-3 pb-3">
                    <p className="break-all font-semibold text-ink">{m.filename}</p>
                    <p className="text-sm text-ink-2">
                      {formatBytes(m.sizeBytes)}
                      {m.width && m.height ? ` · ${m.width} × ${m.height}` : ""} · {formatDate(m.createdAt)}
                    </p>
                    <p className="text-sm text-ink">
                      <span className="font-semibold">Alt-Text:</span> {m.altText}
                    </p>
                    <p className="text-sm text-ink-2">{m.usage > 0 ? `In ${m.usage} Artikelversion(en) verwendet` : "Nicht verwendet"}</p>
                    {m.usage === 0 && configured && (
                      <div className="pt-2">
                        <StatusAction
                          action={deleteMediaAction}
                          fields={{ mediaId: m.id }}
                          label="Löschen"
                          size="sm"
                          variant="quiet-danger"
                          confirm={{ title: "Bild löschen?", body: "Das Bild wird aus der Objektablage entfernt.", confirmLabel: "Löschen", variant: "danger" }}
                        />
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
