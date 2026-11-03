/**
 * Datensparsame Logtexte (NFR15): Fehlermeldungen von Bibliotheken oder der Datenbank können
 * Eingabewerte enthalten (z. B. «invalid input syntax for type uuid: "…"»). Vor dem Loggen werden
 * zitierte Werte, E-Mail-Adressen, Telefonnummern und lange Zahlenfolgen entfernt.
 */
const REDACTED = "[entfernt]";

export function redactLogText(input: unknown, maxLength = 200): string {
  const text = typeof input === "string" ? input : input instanceof Error ? input.message : "";
  return text
    .replace(/[\r\n\t]+/g, " ")
    .replace(/"[^"]*"|'[^']*'|«[^»]*»|`[^`]*`/g, REDACTED)
    .replace(/[^\s@]+@[^\s@]+/g, REDACTED)
    .replace(/\+?\d[\d .-]{5,}\d/g, REDACTED)
    .replace(/\(([^()]*)\)=\(([^()]*)\)/g, `($1)=${REDACTED}`)
    .slice(0, maxLength);
}

/** Bezeichner, die nie in Log-Argumenten vorkommen dürfen (automatisierte Prüfung, NFR15). */
export const FORBIDDEN_LOG_FIELDS = [
  "email",
  "replyEmail",
  "password",
  "passwordHash",
  "pseudonym",
  "body",
  "note",
  "noteEncrypted",
  "comment",
  "phone",
  "token",
  "secret",
  "payload",
  "params",
  "query",
  "searchParams",
  "formData",
  "values",
  "energy",
  "mood",
  "fatigue",
  "symptoms",
] as const;

/**
 * Findet verbotene Felder in einem Log-Aufruf (Quelltext der Argumente). `err.message` ist nur
 * über redactLogText() erlaubt.
 */
export function forbiddenLogFields(argsSource: string): string[] {
  // Nur Ausdrücke prüfen: feste Texte in Anführungszeichen sind unkritisch, bei Template-Strings zählen die ${…}-Teile.
  const code = argsSource
    .replace(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'/g, '""')
    .replace(/`(?:[^`\\]|\\.)*`/g, (tpl) => (tpl.match(/\$\{[^}]*\}/g) ?? []).join(" "));
  const found = new Set<string>();
  for (const f of FORBIDDEN_LOG_FIELDS) {
    if (new RegExp(`(^|[^A-Za-z0-9_$])${f}\\b`).test(code)) found.add(f);
  }
  const withoutRedacted = code.replace(/redactLogText\([^)]*\)/g, "");
  if (/\.message\b/.test(withoutRedacted)) found.add("message");
  return [...found];
}
