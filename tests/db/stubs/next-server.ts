/** Stub für `next/server` in DB-Integrationstests (kein Request-Kontext). */
export async function connection(): Promise<void> {}
/** `after()` läuft im Test nicht nach der Antwort – Nebenarbeit (Analytics) wird verworfen. */
export function after(): void {}
export class NextResponse extends Response {}
export type NextRequest = Request;
