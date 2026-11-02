"use server";

import { eq, sql as dsql } from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod";
import { fail, ok, zodFieldErrors, type ActionState } from "@/lib/action-state";
import { cleanText, runAction, str } from "../../action";
import { encrypt, encryptOptional, sha256 } from "../../crypto";
import { db } from "../../db";
import { contactMessages, supportOffers } from "../../db/schema";
import { consume, LIMITS } from "../../rate-limit";
import { CONTACT_MIN_FILL_MS, CONTACT_TOKEN_MAX_AGE_MS, readContactToken, resolveContactRef } from "./contact";
import { CONTACT_CATEGORIES, CONTACT_MAX } from "./shared";

const contactSchema = z.object({
  category: z.enum(CONTACT_CATEGORIES.map(([c]) => c) as [string, ...string[]], { message: "Bitte wähle eine Kategorie." }),
  message: z
    .string()
    .min(10, "Bitte beschreibe dein Anliegen in mindestens 10 Zeichen.")
    .max(CONTACT_MAX, "Höchstens 2 000 Zeichen."),
  replyEmail: z.union([z.literal(""), z.email("Bitte prüfe die E-Mail-Adresse.").max(200, "Höchstens 200 Zeichen.")]),
});

const SUCCESS = "Danke. Dein Anliegen ist bei uns eingegangen. Wenn du eine Antwortadresse angegeben hast, melden wir uns dort.";

/**
 * S51 Kontakt und Fehler melden (CON06). Öffentlich, ohne Anhänge, Anliegen verschlüsselt.
 * Hinweise zu Angeboten erzeugen einen Prüfauftrag (CON05). Inhalte werden nie geloggt.
 */
export async function submitContactAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = {
    category: str(formData, "category"),
    message: cleanText(String(formData.get("message") ?? "")),
    replyEmail: str(formData, "replyEmail"),
  };
  return runAction(async () => {
    // Honeypot: Menschen sehen dieses Feld nicht. Kein Hinweis an Automaten.
    if (str(formData, "website")) return ok(SUCCESS, { data: { sent: true } });

    const started = readContactToken(str(formData, "formToken"));
    const age = started ? Date.now() - started : -1;
    if (!started || age > CONTACT_TOKEN_MAX_AGE_MS)
      return fail("Das Formular ist abgelaufen. Bitte lade die Seite neu – deine Eingaben stehen unten noch zur Verfügung.", { values });
    if (age < CONTACT_MIN_FILL_MS) return fail("Das ging sehr schnell. Bitte prüfe deine Angaben und sende das Formular erneut.", { values });

    const parsed = contactSchema.safeParse(values);
    if (!parsed.success) return fail("Bitte prüfe die markierten Felder.", { fieldErrors: zodFieldErrors(parsed.error.issues), values });

    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
    if (!(await consume(`contact:${sha256(ip).slice(0, 32)}`, LIMITS.contactForm.limit, LIMITS.contactForm.window)))
      return fail("Über diese Verbindung wurden in der letzten Stunde bereits mehrere Anliegen gesendet. Bitte versuche es später erneut.", { values });

    const ref = await resolveContactRef(str(formData, "refType"), str(formData, "refId"));
    await db.transaction(async (tx) => {
      await tx.insert(contactMessages).values({
        category: parsed.data.category,
        messageEncrypted: encrypt(parsed.data.message),
        replyEmailEncrypted: encryptOptional(parsed.data.replyEmail.toLowerCase()),
        refType: ref?.type ?? null,
        refId: ref?.id ?? null,
      });
      // CON05: Hinweis zu einem Angebot erzeugt einen Prüfauftrag im Arbeitsvorrat.
      if (ref?.type === "offer") {
        await tx
          .update(supportOffers)
          .set({ changeFlag: true, changeNote: dsql`coalesce(${supportOffers.changeNote}, 'Hinweis über das Kontaktformular')` })
          .where(eq(supportOffers.id, ref.id));
      }
    });
    return ok(SUCCESS, { data: { sent: true } });
  }, values);
}
