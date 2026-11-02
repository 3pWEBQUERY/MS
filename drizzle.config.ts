import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema/index.ts",
  out: "./drizzle",
  casing: "snake_case",
  dbCredentials: { url: process.env.DATABASE_URL ?? "postgres://postgres@localhost:5432/ms" },
  schemaFilter: ["identity", "health", "community", "messaging", "content", "moderation", "privacy", "ops"],
  strict: true,
  verbose: false,
});
