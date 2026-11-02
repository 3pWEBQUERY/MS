"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import type { ActionState } from "@/lib/action-state";

const MAX = 5 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp,image/avif";

/**
 * Upload in die Medienbibliothek über POST /api/v1/media (Route Handler, weil Bilder bis 5 MB
 * die Grenze für Server Actions überschreiten). Ohne JavaScript funktioniert das Formular
 * ebenfalls; der Server leitet dann mit Ergebniscode zurück. Typ wird serverseitig am Inhalt geprüft.
 */
export function MediaUploader() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, setState] = useState<ActionState>({ status: "idle" });
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<{ file?: string; altText?: string }>({});

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const file = data.get("file");
    const alt = String(data.get("altText") ?? "").trim();
    const next: typeof errors = {};
    if (!(file instanceof File) || file.size === 0) next.file = "Bitte wähle eine Bilddatei aus.";
    else if (file.size > MAX) next.file = "Das Bild ist grösser als 5 MB.";
    if (alt.length < 3) next.altText = "Bitte beschreibe das Bild (mindestens 3 Zeichen).";
    setErrors(next);
    if (Object.keys(next).length) {
      setState({ status: "error", message: "Bitte prüfe die markierten Felder." });
      return;
    }
    setPending(true);
    setState({ status: "idle" });
    try {
      const res = await fetch("/api/v1/media", { method: "POST", body: data, headers: { Accept: "application/json" } });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (res.ok && json?.ok) {
        setState({ status: "success", message: json.message ?? "Bild hochgeladen." });
        formRef.current?.reset();
        router.refresh();
      } else {
        setState({ status: "error", message: json?.message ?? "Das Hochladen hat nicht geklappt. Es wurde nichts gespeichert." });
      }
    } catch {
      setState({ status: "error", message: "Keine Verbindung. Das Bild wurde nicht gespeichert – bitte versuche es erneut." });
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      ref={formRef}
      action="/api/v1/media"
      method="post"
      encType="multipart/form-data"
      onSubmit={onSubmit}
      className="flex max-w-2xl flex-col gap-5"
      noValidate
    >
      <FormMessage state={state} />
      <Field label="Bilddatei" required error={errors.file} hint="JPEG, PNG, WebP oder AVIF, höchstens 5 MB. SVG ist aus Sicherheitsgründen nicht erlaubt.">
        {(p) => (
          <input
            {...p}
            name="file"
            type="file"
            accept={ACCEPT}
            className="block w-full rounded-[12px] border border-field bg-surface p-3 text-base text-ink file:mr-4 file:h-10 file:rounded-[10px] file:border-0 file:bg-sunk file:px-4 file:font-semibold file:text-ink"
          />
        )}
      </Field>
      <Field label="Alternativtext" required error={errors.altText} hint="Beschreibe kurz, was zu sehen ist – für Menschen, die das Bild nicht sehen (A01).">
        {(p) => <Input {...p} name="altText" maxLength={300} />}
      </Field>
      <Button
        type="submit"
        disabled={pending}
        aria-disabled={pending || undefined}
        className="w-full sm:w-fit"
        icon={<Icon name={pending ? "loader" : "upload"} className={pending ? "size-5 motion-safe:animate-spin" : "size-5"} />}
      >
        {pending ? "Wird hochgeladen …" : "Bild hochladen"}
      </Button>
    </form>
  );
}
