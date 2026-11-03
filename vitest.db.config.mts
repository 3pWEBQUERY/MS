import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * DB-Integrationstests (PRD 16 «Integrationstests prüfen Datenbankregeln, Rollen, Transaktionen
 * und Jobs»): laufen gegen eine frisch migrierte Testdatenbank «ms_test».
 *   npm run test:db      (legt ms_test neu an und führt tests/db/** aus)
 * `npm test` bleibt ohne Datenbank lauffähig.
 */
const stub = (name: string) => fileURLToPath(new URL(`./tests/db/stubs/${name}.ts`, import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      { find: "@", replacement: fileURLToPath(new URL("./src", import.meta.url)) },
      { find: "server-only", replacement: fileURLToPath(new URL("./tests/server-only-stub.ts", import.meta.url)) },
      { find: /^next\/server$/, replacement: stub("next-server") },
      { find: /^next\/headers$/, replacement: stub("next-headers") },
      { find: /^next\/cache$/, replacement: stub("next-cache") },
    ],
  },
  test: {
    environment: "node",
    include: ["tests/db/**/*.test.ts"],
    setupFiles: ["tests/db/setup.ts"],
    // Eine Datenbank für alle Dateien: nacheinander, damit Zeit- und Zählerprüfungen stabil bleiben.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? "postgres://postgres@localhost:5432/ms_test",
      DATA_ENCRYPTION_KEY: "ZGV2LW9ubHktZGF0YS1rZXktbm90LWZvci1wcm9kISE=",
      DB_POOL_MAX: "4",
    },
  },
});
