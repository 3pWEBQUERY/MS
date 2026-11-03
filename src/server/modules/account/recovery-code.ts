/**
 * Wiederherstellungscodes (ACC05): Format «xxxxx-xxxxx», gespeichert als SHA-256 des
 * kleingeschriebenen Codes. Eingaben ohne Bindestrich, mit Leerzeichen oder in
 * Grossbuchstaben (z. B. aus einem Passwortmanager) werden vor dem Vergleich vereinheitlicht.
 */
export function normalizeRecoveryCode(input: string): string {
  const compact = input.toLowerCase().replace(/[\s‐-―-]/g, "");
  if (/^[a-z0-9]{10}$/.test(compact)) return `${compact.slice(0, 5)}-${compact.slice(5)}`;
  return input.toLowerCase().replace(/\s/g, "");
}
