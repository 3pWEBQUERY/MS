import "server-only";
import { createHash } from "node:crypto";
import { passwordProblem } from "./password-policy";

/**
 * ACC04 «kompromittierte Passwörter abweisen»: optionaler Abgleich mit Pwned Passwords
 * über k-Anonymität. Der Server sendet nur die ersten 5 Zeichen des SHA-1-Hashs, nie das Passwort
 * und nie den vollständigen Hash; die Antwort ist gepolstert («Add-Padding»), damit die Länge
 * nichts verrät. Keine Personendaten, kein Konto beim Dienst.
 *
 * Ausgeschaltet, bis D04 den Dienst freigibt: PASSWORD_LEAK_CHECK=pwned schaltet ihn ein.
 * Bei Zeitüberschreitung oder Störung gilt «nicht geprüft» (fail open) – Registrierung und
 * Passwortwechsel dürfen nicht an einem Drittdienst hängen. Log nur mit Fehlercode.
 */
const RANGE_URL = "https://api.pwnedpasswords.com/range/";
const TIMEOUT_MS = 2500;

export function leakCheckEnabled(): boolean {
  return process.env.PASSWORD_LEAK_CHECK === "pwned";
}

/** true = in Leaks gefunden, false = nicht gefunden, null = nicht geprüft (aus oder Störung). */
export async function isPasswordLeaked(password: string, fetchImpl: typeof fetch = fetch): Promise<boolean | null> {
  if (!leakCheckEnabled()) return null;
  const sha1 = createHash("sha1").update(password.normalize("NFKC"), "utf8").digest("hex").toUpperCase();
  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);
  try {
    const res = await fetchImpl(RANGE_URL + prefix, {
      headers: { "Add-Padding": "true", "User-Agent": "ms-plattform-passwortpruefung" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error(`[auth] Leak-Prüfung nicht verfügbar: http_${res.status}`);
      return null;
    }
    const body = await res.text();
    for (const line of body.split("\n")) {
      const [s, count] = line.trim().split(":");
      // Polsterzeilen haben die Anzahl 0
      if (s === suffix && Number(count) > 0) return true;
    }
    return false;
  } catch (err) {
    console.error(`[auth] Leak-Prüfung nicht verfügbar: ${err instanceof Error ? err.name : "error"}`);
    return null;
  }
}

/** Regeln aus password-policy.ts und – falls eingeschaltet – der Leak-Abgleich. */
export async function passwordProblemChecked(password: string, email?: string): Promise<string | null> {
  const local = passwordProblem(password, email);
  if (local) return local;
  if (await isPasswordLeaked(password)) {
    return "Dieses Passwort ist in bekannten Datenlecks aufgetaucht. Bitte wähle ein anderes – ein Satz aus mehreren Wörtern ist sicher und gut zu merken.";
  }
  return null;
}
