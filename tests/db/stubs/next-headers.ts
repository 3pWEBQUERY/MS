/** Stub für `next/headers`: leere Header, keine Cookies (Viewer wird im Test gesetzt). */
export async function headers(): Promise<Headers> {
  return new Headers({ "user-agent": "vitest", "x-forwarded-for": "127.0.0.1" });
}
const jar = new Map<string, string>();
export async function cookies() {
  return {
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
    set: (name: string, value: string) => void jar.set(name, value),
    delete: (name: string) => void jar.delete(name),
    has: (name: string) => jar.has(name),
    getAll: () => [...jar].map(([name, value]) => ({ name, value })),
  };
}
