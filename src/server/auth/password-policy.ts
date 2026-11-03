/**
 * Passwortregeln (ACC04, NIST SP 800-63B): mindestens 15 Zeichen, mindestens 64 unterstützt
 * (hier 128), Einfügen erlaubt, keine Kompositionsregeln. Abgewiesen werden häufige bzw.
 * bekanntermassen kompromittierte Passwörter und triviale Muster. Rein, ohne Abhängigkeiten.
 *
 * Ein Abgleich mit einem externen Leak-Dienst (z. B. k-Anonymitäts-Abfrage) ist ein neuer
 * Auftragsbearbeiter und erst nach Freigabe in D04 vorgesehen.
 */
export const PASSWORD_MIN = 15;
export const PASSWORD_MAX = 128;

/** Häufige oder in Leaks verbreitete Passwörter mit mindestens 15 Zeichen (Auszug, kleingeschrieben). */
const COMMON = new Set([
  "passwortpasswort",
  "passwordpassword",
  "123456789012345",
  "1234567890123456",
  "12345678901234567890",
  "qwertzuiopasdfgh",
  "qwertyuiopasdfgh",
  "qwertyuiopasdfghjkl",
  "qwertzuiopasdfghjkl",
  "iloveyouiloveyou",
  "passwort1234567",
  "password1234567",
  "password12345678",
  "hallohallohallo",
  "schweizschweiz",
  "multiplesklerose",
  "multiplesklerose1",
  "willkommen12345",
  "letmeinletmein1",
  "abcdefghijklmnop",
  "zurich1234567890",
  "zuerich123456789",
  "qwertz123456789",
  "123qweasdzxc1234",
  "1q2w3e4r5t6y7u8i",
  "1qaz2wsx3edc4rfv",
  "trustno1trustno1",
  "monkeymonkey1234",
  "dragondragon1234",
  "football12345678",
  "sommer2026sommer",
  "winter2026winter",
  "correcthorsebatterystaple",
  "thequickbrownfox",
  "ichliebedichsehr",
  "superpasswort123",
  "meinpasswort1234",
  "meinneuespasswort",
  "sicherespasswort",
  "geheimespasswort",
]);

/** Häufige Grundwörter: nur aus diesem Wort plus Ziffern/Zeichen bestehende Passwörter sind zu schwach. */
const BASE_WORDS = new Set([
  "passwort",
  "password",
  "kennwort",
  "geheim",
  "qwertz",
  "qwerty",
  "asdfgh",
  "yxcvbn",
  "zxcvbn",
  "hallo",
  "welcome",
  "willkommen",
  "sommer",
  "winter",
  "fruehling",
  "herbst",
  "schweiz",
  "zuerich",
  "zurich",
  "admin",
  "letmein",
  "iloveyou",
  "abc",
  "test",
  "msplattform",
  "multiplesklerose",
]);

const SEQUENCES = ["0123456789", "abcdefghijklmnopqrstuvwxyz", "qwertzuiop", "qwertyuiop", "asdfghjkl", "yxcvbnm", "zxcvbnm"];

/** Kürzeste Einheit, aus deren Wiederholung der Text besteht (sonst der Text selbst). */
function repeatedUnit(s: string): string {
  for (let unit = 1; unit <= Math.floor(s.length / 2); unit++) {
    if (s.length % unit === 0 && s.slice(0, unit).repeat(s.length / unit) === s) return s.slice(0, unit);
  }
  return s;
}

/** Liegt das Passwort vollständig auf einer Tastatur- oder Zahlenfolge (auch rückwärts)? */
function isSequence(s: string): boolean {
  return SEQUENCES.some((seq) => {
    const doubled = seq + seq;
    return doubled.includes(s) || [...doubled].reverse().join("").includes(s);
  });
}

export function passwordProblem(password: string, email?: string): string | null {
  if (password.length < PASSWORD_MIN) return `Bitte verwende mindestens ${PASSWORD_MIN} Zeichen.`;
  if (password.length > PASSWORD_MAX) return `Bitte verwende höchstens ${PASSWORD_MAX} Zeichen.`;
  const lower = password.toLowerCase().normalize("NFKC");
  const folded = lower.replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue");
  const letters = folded.replace(/[^a-z]/g, "");
  const compact = folded.replace(/[\s._\-!?#*+]/g, "");

  if (COMMON.has(lower) || COMMON.has(compact)) return "Dieses Passwort ist zu bekannt. Bitte wähle ein anderes.";
  if (/^(.)\1+$/.test(password)) return "Bitte verwende nicht nur ein einziges Zeichen.";
  if (new Set(compact).size < 5 || repeatedUnit(compact) !== compact) return "Bitte verwende keine Wiederholung weniger Zeichen.";
  if (isSequence(compact) || /^\d+$/.test(compact)) return "Bitte verwende keine einfache Zeichen- oder Zahlenfolge.";
  // Bekanntes Grundwort (auch wiederholt) plus Ziffern und Zeichen, z. B. «Passwort2026!!!!!»
  if (letters.length > 0 && BASE_WORDS.has(repeatedUnit(letters)))
    return "Dieses Passwort ist zu leicht zu erraten. Ein Satz aus mehreren Wörtern ist sicherer.";
  const local = email?.split("@")[0]?.toLowerCase();
  if (local && local.length >= 4 && lower.includes(local)) return "Das Passwort darf deine E-Mail-Adresse nicht enthalten.";
  return null;
}
