import "server-only";

/**
 * Zentrale, serverseitige Konfiguration. Keine Geheimnisse im Client (NFR10).
 * Railway Postgres liefert DATABASE_URL, Railway Bucket liefert BUCKET, ACCESS_KEY_ID,
 * SECRET_ACCESS_KEY, REGION und ENDPOINT.
 */
function read(name: string, fallback?: string): string {
  const value = process.env[name];
  if (value && value.length > 0) return value;
  if (fallback !== undefined) return fallback;
  throw new Error(`Umgebungsvariable ${name} fehlt`);
}

const isProd = process.env.NODE_ENV === "production";

export const env = {
  isProd,
  appUrl: read("APP_URL", process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : "http://localhost:3000"),
  databaseUrl: () => read("DATABASE_URL", "postgres://postgres@localhost:5432/ms"),
  /** 32 Byte, base64. Lokal wird ein abgeleiteter Entwicklungsschlüssel verwendet. */
  dataKey: () => read("DATA_ENCRYPTION_KEY", isProd ? undefined : "ZGV2LW9ubHktZGF0YS1rZXktbm90LWZvci1wcm9kISE="),
  bucket: {
    name: () => process.env.BUCKET ?? process.env.S3_BUCKET ?? "",
    endpoint: () => process.env.ENDPOINT ?? process.env.S3_ENDPOINT ?? "",
    region: () => process.env.REGION ?? process.env.S3_REGION ?? "auto",
    accessKeyId: () => process.env.ACCESS_KEY_ID ?? process.env.AWS_ACCESS_KEY_ID ?? "",
    secretAccessKey: () => process.env.SECRET_ACCESS_KEY ?? process.env.AWS_SECRET_ACCESS_KEY ?? "",
    forcePathStyle: () => process.env.S3_FORCE_PATH_STYLE === "true",
  },
  mail: {
    host: () => process.env.SMTP_HOST ?? "",
    port: () => Number(process.env.SMTP_PORT ?? 587),
    user: () => process.env.SMTP_USER ?? "",
    pass: () => process.env.SMTP_PASS ?? "",
    from: () => process.env.MAIL_FROM ?? "MS Plattform <no-reply@localhost>",
  },
  demoMode: () => process.env.DEMO_MODE !== "false",
};
