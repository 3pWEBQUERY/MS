/** Erster Wert eines Suchparameters (Next.js liefert string | string[] | undefined). */
export function param(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
}

/** Baut eine Query-Zeichenkette ohne leere Werte. */
export function query(base: string, values: Record<string, string | null | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(values)) if (v) sp.set(k, v);
  const s = sp.toString();
  return s ? `${base}?${s}` : base;
}
