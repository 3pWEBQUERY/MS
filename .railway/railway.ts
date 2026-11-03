/**
 * Railway Infrastructure as Code – Beschreibung des Projekts «MS Plattform».
 * Anwenden mit der Railway-CLI (`railway link`, dann `railway config plan` / `railway config apply`).
 * Benötigt das Paket `railway` (`npm install -D railway`). Geheimnisse bleiben in Railway (`preserve()`).
 *
 * Region: Amsterdam (europe-west4) – Railway bietet keine Schweizer Region. Die PRD-Vorgabe
 * «primäre Datenhaltung in der Schweiz» (Kapitel 11, D04) ist damit noch NICHT erfüllt und
 * vor produktiven Daten zu entscheiden.
 */
import { bucket, defineRailway, github, postgres, preserve, project, service } from "railway/iac";

export default defineRailway((ctx) => {
  const db = postgres("Postgres");
  const media = bucket("ms-medien", { region: "ams" });

  const shared = {
    DATABASE_URL: db.env.DATABASE_URL,
    BUCKET: ctx.shared.BUCKET,
    ENDPOINT: ctx.shared.ENDPOINT,
    REGION: ctx.shared.REGION,
    ACCESS_KEY_ID: ctx.shared.ACCESS_KEY_ID,
    SECRET_ACCESS_KEY: ctx.shared.SECRET_ACCESS_KEY,
    DATA_ENCRYPTION_KEY: ctx.shared.DATA_ENCRYPTION_KEY,
    APP_URL: ctx.shared.APP_URL,
    DEMO_MODE: ctx.shared.DEMO_MODE,
    TZ: "Europe/Zurich",
  };

  const web = service("web", {
    source: github("3pwebquery/ms", { branch: "claude/laughing-bell-1whiqu" }),
    build: "npm run build",
    start: "npm run start",
    preDeploy: "npm run db:migrate",
    healthcheck: "/api/v1/health",
    healthcheckTimeout: 120,
    replicas: { "europe-west4": 1 },
    env: { ...shared, PORT: "8080", NEXT_SERVER_ACTIONS_ENCRYPTION_KEY: preserve() },
  });

  const worker = service("worker", {
    source: github("3pwebquery/ms", { branch: "claude/laughing-bell-1whiqu" }),
    build: 'echo "Worker: kein Next.js-Build nötig"',
    start: "npm run worker",
    replicas: { "europe-west4": 1 },
    env: { ...shared, NODE_ENV: "production" },
  });

  return project("MS Plattform", { resources: [db, media, web, worker] });
});
