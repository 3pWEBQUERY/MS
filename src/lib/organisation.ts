/**
 * Angaben der Trägerschaft für Impressum, Datenschutzinformation und Kontaktstellen (S50, PRI01, PRI08).
 * Werden NICHT im Code gepflegt, sondern als Umgebungsvariablen (Railway) gesetzt – so bleiben Texte
 * und Versionen stabil, und vor dem Pilot genügt es, die Variablen zu füllen.
 *
 * In Rechtstexten stehen Platzhalter `{{org.name}}` usw. Fehlende Angaben erscheinen sichtbar als
 * «[… eintragen]», nie als leere Stelle. `missingOrganisationFields()` speist den Betriebsalarm
 * `legal_placeholders` (ops-alarms.ts), damit kein Pilot mit Platzhaltern startet.
 */
export const ORG_FIELDS = {
  name: { env: "ORG_NAME", label: "Name der Trägerschaft" },
  legalForm: { env: "ORG_LEGAL_FORM", label: "Rechtsform" },
  street: { env: "ORG_STREET", label: "Strasse und Hausnummer" },
  zipCity: { env: "ORG_ZIP_CITY", label: "Postleitzahl und Ort" },
  privacyEmail: { env: "ORG_PRIVACY_EMAIL", label: "E-Mail der Datenschutzkontaktstelle" },
  productOwner: { env: "ORG_PRODUCT_OWNER", label: "Produktverantwortung" },
  medicalLead: { env: "ORG_MEDICAL_LEAD", label: "Medizinische Redaktionsleitung" },
  moderationLead: { env: "ORG_MODERATION_LEAD", label: "Moderationsleitung" },
  privacyContact: { env: "ORG_PRIVACY_CONTACT", label: "Datenschutzkontaktstelle" },
  processors: { env: "ORG_PROCESSORS", label: "Liste der Dienstleister mit Sitz und Datenstandort" },
  dataLocations: { env: "ORG_DATA_LOCATIONS", label: "Länder der Datenbearbeitung" },
} as const;

export type OrgField = keyof typeof ORG_FIELDS;

function value(field: OrgField, env: Record<string, string | undefined>): string | null {
  const v = env[ORG_FIELDS[field].env]?.trim();
  return v ? v : null;
}

/** Ersetzt {{org.feld}} durch die Angabe oder durch einen sichtbaren Platzhalter. `\n` in Werten wird zur neuen Zeile. */
export function fillOrganisation(text: string, env: Record<string, string | undefined> = process.env): string {
  return text.replace(/\{\{org\.([a-zA-Z]+)\}\}/g, (match, key: string) => {
    if (!(key in ORG_FIELDS)) return match;
    const field = key as OrgField;
    return value(field, env)?.replace(/\\n/g, "\n") ?? `[${ORG_FIELDS[field].label} eintragen]`;
  });
}

/** Felder, die in den gegebenen Texten verwendet, aber nicht gesetzt sind. */
export function missingOrganisationFields(texts: string[], env: Record<string, string | undefined> = process.env): OrgField[] {
  const used = new Set<OrgField>();
  for (const t of texts) for (const m of t.matchAll(/\{\{org\.([a-zA-Z]+)\}\}/g)) if (m[1] in ORG_FIELDS) used.add(m[1] as OrgField);
  return [...used].filter((f) => value(f, env) === null);
}
