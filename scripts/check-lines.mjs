/**
 * Projektregel: Keine Datei darf mehr als 600 Zeilen haben.
 * Ausgenommen sind nur generierte Dateien (Lockfile, Drizzle-Snapshots) und Binärdateien.
 *   npm run check:lines
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const MAX = 600;
const EXCLUDE = [/^package-lock\.json$/, /^drizzle\/meta\//, /\.(woff2?|png|jpe?g|ico|svg)$/];

const files = execSync("git ls-files --cached --others --exclude-standard", { encoding: "utf8" })
  .split("\n")
  .filter(Boolean)
  .filter((f) => !EXCLUDE.some((re) => re.test(f)));

const tooLong = [];
for (const f of files) {
  let text;
  try {
    text = readFileSync(f, "utf8");
  } catch {
    continue;
  }
  const lines = text.split("\n").length - (text.endsWith("\n") ? 1 : 0);
  if (lines > MAX) tooLong.push([f, lines]);
}

if (tooLong.length) {
  console.error(`Dateien mit mehr als ${MAX} Zeilen:`);
  for (const [f, n] of tooLong.sort((a, b) => b[1] - a[1])) console.error(`  ${n}\t${f}`);
  process.exit(1);
}
console.log(`OK – alle ${files.length} Dateien haben höchstens ${MAX} Zeilen.`);
