# Railway-Cron-Service «backup» (NFR07): stündliche, verschlüsselte Datenbanksicherung.
# pg_dump muss mindestens die Hauptversion des Servers haben (Railway Postgres 18).
FROM node:22-bookworm-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl gnupg \
 && install -d /usr/share/postgresql-common/pgdg \
 && curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc \
 && echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt bookworm-pgdg main" > /etc/apt/sources.list.d/pgdg.list \
 && apt-get update \
 && apt-get install -y --no-install-recommends postgresql-client-18 \
 && apt-get purge -y curl gnupg && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json ./
# Nur Laufzeitabhängigkeiten; tsx und @aws-sdk/client-s3 sind dort enthalten
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund
COPY tsconfig.json ./
COPY scripts/backup ./scripts/backup

USER node
CMD ["npx", "tsx", "scripts/backup/run.ts"]
