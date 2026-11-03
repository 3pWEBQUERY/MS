import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { forbiddenLogFields, redactLogText } from "./log-safety";

describe("redactLogText (NFR15)", () => {
  it("entfernt zitierte Werte, Adressen und Nummern", () => {
    expect(redactLogText('invalid input syntax for type uuid: "abc-123"')).toBe("invalid input syntax for type uuid: [entfernt]");
    expect(redactLogText("Zustellung an anna@example.ch fehlgeschlagen")).toBe("Zustellung an [entfernt] fehlgeschlagen");
    expect(redactLogText("Rückruf +41 79 123 45 67")).toBe("Rückruf [entfernt]");
    expect(redactLogText("Key (email)=(a@b.ch) already exists")).not.toContain("a@b.ch");
    expect(redactLogText(new Error("Zeile\nzwei"))).toBe("Zeile zwei");
    expect(redactLogText(undefined)).toBe("");
    expect(redactLogText("x".repeat(500), 50)).toHaveLength(50);
  });
});

describe("forbiddenLogFields", () => {
  it("erkennt verbotene Felder in Log-Argumenten", () => {
    expect(forbiddenLogFields("`[x] ${viewer.email}`")).toContain("email");
    expect(forbiddenLogFields("err.message.slice(0, 200)")).toContain("message");
    expect(forbiddenLogFields("redactLogText(err.message)")).toEqual([]);
    expect(forbiddenLogFields('"[worker] token abgelaufen"')).toEqual([]);
    expect(forbiddenLogFields("`[worker] ${ev.type} ${ev.id}`")).toEqual([]);
  });
});

/** Automatisierte verbotene-Felder-Prüfung über alle Log-Aufrufe im Anwendungscode (NFR15). */
describe("Log-Aufrufe im Quelltext", () => {
  const root = join(__dirname, "..");
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(name) && !/\.test\.ts$/.test(name)) files.push(p);
    }
  };
  walk(root);

  it("enthalten keine Inhalte, Personendaten oder Gesundheitswerte", () => {
    const problems: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      const re = /console\.(log|info|warn|error|debug)\(/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(src))) {
        // Argumente bis zur passenden schliessenden Klammer
        let depth = 1;
        let i = m.index + m[0].length;
        while (i < src.length && depth > 0) {
          if (src[i] === "(") depth++;
          else if (src[i] === ")") depth--;
          i++;
        }
        const args = src.slice(m.index + m[0].length, i - 1);
        const bad = forbiddenLogFields(args);
        if (bad.length) {
          const line = src.slice(0, m.index).split("\n").length;
          problems.push(`${relative(root, file)}:${line} → ${bad.join(", ")}`);
        }
      }
    }
    expect(problems).toEqual([]);
  });
});
