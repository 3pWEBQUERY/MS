import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { isPasswordLeaked, passwordProblemChecked } from "./password-leak";

const PW = "ein langer satz mit vielen woertern";
const sha1 = createHash("sha1").update(PW).digest("hex").toUpperCase();

function fakeFetch(body: string, status = 200) {
  return vi.fn(async (url: string | URL | Request) => {
    void url;
    return new Response(body, { status });
  }) as unknown as typeof fetch;
}

afterEach(() => {
  delete process.env.PASSWORD_LEAK_CHECK;
  vi.unstubAllGlobals();
});

describe("Leak-Abgleich (ACC04)", () => {
  it("ist ohne Freigabe ausgeschaltet und fragt nichts ab", async () => {
    const f = fakeFetch("");
    expect(await isPasswordLeaked(PW, f)).toBeNull();
    expect(f).not.toHaveBeenCalled();
  });

  it("sendet nur die ersten 5 Hash-Zeichen und erkennt Treffer", async () => {
    process.env.PASSWORD_LEAK_CHECK = "pwned";
    const f = fakeFetch(`0000000000000000000000000000000000A:0\r\n${sha1.slice(5)}:42\r\n`);
    expect(await isPasswordLeaked(PW, f)).toBe(true);
    const url = String((f as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][0]);
    expect(url.endsWith(`/range/${sha1.slice(0, 5)}`)).toBe(true);
    expect(url).not.toContain(sha1.slice(5));
  });

  it("wertet Polsterzeilen (Anzahl 0) nicht als Treffer", async () => {
    process.env.PASSWORD_LEAK_CHECK = "pwned";
    expect(await isPasswordLeaked(PW, fakeFetch(`${sha1.slice(5)}:0\r\n`))).toBe(false);
  });

  it("lässt bei Störung die Registrierung nicht scheitern (fail open)", async () => {
    process.env.PASSWORD_LEAK_CHECK = "pwned";
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await isPasswordLeaked(PW, fakeFetch("", 503))).toBeNull();
    const broken = vi.fn(async () => {
      throw new Error("netz");
    }) as unknown as typeof fetch;
    expect(await isPasswordLeaked(PW, broken)).toBeNull();
  });

  it("meldet einen gefundenen Leak als verständlichen Hinweis", async () => {
    process.env.PASSWORD_LEAK_CHECK = "pwned";
    vi.stubGlobal("fetch", fakeFetch(`${sha1.slice(5)}:3\r\n`));
    expect(await passwordProblemChecked(PW)).toMatch(/Datenlecks/);
    expect(await passwordProblemChecked("kurz")).toMatch(/mindestens 15/);
  });
});
