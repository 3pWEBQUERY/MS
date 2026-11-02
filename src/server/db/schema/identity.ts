import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgSchema,
  smallint,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { createdAt, id, ts, updatedAt, version } from "./_shared";

/**
 * Identität und Konto (PRD 09 «Identität und persönliche Daten»).
 * Identitätsdaten (E-Mail) werden nie in Community-Abfragen verwendet.
 */
export const identity = pgSchema("identity");

export const accountStatus = identity.enum("account_status", [
  "unverified",
  "active",
  "restricted",
  "suspended",
  "deletion_pending",
  "deleted",
]);

export const staffRole = identity.enum("staff_role", [
  "moderator",
  "moderation_lead",
  "editor",
  "medical_reviewer",
  "admin",
  "ops",
  "privacy_officer",
]);

export const tokenPurpose = identity.enum("token_purpose", [
  "verify_email",
  "reset_password",
  "change_email",
]);

export const consentPurpose = identity.enum("consent_purpose", [
  "terms",
  "privacy_notice",
  "health_area",
  "analytics",
  "community_rules",
]);

export const consentDecision = identity.enum("consent_decision", ["granted", "denied", "withdrawn"]);

export const accounts = identity.table(
  "accounts",
  {
    id: id(),
    email: text("email").notNull(),
    emailVerifiedAt: ts("email_verified_at"),
    passwordHash: text("password_hash").notNull(),
    status: accountStatus("status").notNull().default("unverified"),
    /** «Ich bin mindestens 18 Jahre alt und lebe mit MS» (ACC01) */
    audienceConfirmedAt: ts("audience_confirmed_at").notNull(),
    termsVersion: text("terms_version").notNull(),
    mfaEnabled: boolean("mfa_enabled").notNull().default(false),
    lastActiveAt: ts("last_active_at"),
    deactivatedAt: ts("deactivated_at"),
    deletionScheduledAt: ts("deletion_scheduled_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    version: version(),
  },
  (t) => [uniqueIndex("accounts_email_uq").on(sql`lower(${t.email})`), index("accounts_status_idx").on(t.status)],
);

export const sessions = identity.table(
  "sessions",
  {
    id: id(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    deviceType: text("device_type").notNull().default("unbekannt"),
    browser: text("browser"),
    createdAt: createdAt(),
    lastUsedAt: ts("last_used_at").notNull().defaultNow(),
    /** Absolute Grenze 12 h (ACC03) */
    expiresAt: ts("expires_at").notNull(),
    /** Inaktivitätsgrenze 60 min (ACC03) */
    idleExpiresAt: ts("idle_expires_at").notNull(),
    mfaVerifiedAt: ts("mfa_verified_at"),
    /** Zeitpunkt der letzten erneuten Authentifizierung für sensible Aktionen */
    reauthAt: ts("reauth_at"),
    revokedAt: ts("revoked_at"),
  },
  (t) => [uniqueIndex("sessions_token_uq").on(t.tokenHash), index("sessions_account_idx").on(t.accountId)],
);

export const emailTokens = identity.table(
  "email_tokens",
  {
    id: id(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    purpose: tokenPurpose("purpose").notNull(),
    tokenHash: text("token_hash").notNull(),
    newEmail: text("new_email"),
    expiresAt: ts("expires_at").notNull(),
    usedAt: ts("used_at"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("email_tokens_hash_uq").on(t.tokenHash), index("email_tokens_account_idx").on(t.accountId, t.purpose)],
);

export const mfaFactors = identity.table("mfa_factors", {
  id: id(),
  accountId: uuid("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  type: text("type").notNull().default("totp"),
  /** AES-256-GCM verschlüsselt */
  secretEncrypted: text("secret_encrypted").notNull(),
  confirmedAt: ts("confirmed_at"),
  lastUsedStep: integer("last_used_step"),
  createdAt: createdAt(),
});

export const recoveryCodes = identity.table("recovery_codes", {
  id: id(),
  accountId: uuid("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  codeHash: text("code_hash").notNull(),
  usedAt: ts("used_at"),
  createdAt: createdAt(),
});

export const roleAssignments = identity.table(
  "role_assignments",
  {
    id: id(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    role: staffRole("role").notNull(),
    /** Optionaler Geltungsbereich, z. B. eine Gruppen-ID */
    scope: text("scope"),
    startsAt: ts("starts_at").notNull().defaultNow(),
    endsAt: ts("ends_at"),
    grantedBy: uuid("granted_by"),
    approvedBy: uuid("approved_by"),
    revokedAt: ts("revoked_at"),
    revokedBy: uuid("revoked_by"),
    createdAt: createdAt(),
  },
  (t) => [index("role_assignments_account_idx").on(t.accountId)],
);

export const communityProfiles = identity.table(
  "community_profiles",
  {
    accountId: uuid("account_id")
      .primaryKey()
      .references(() => accounts.id, { onDelete: "cascade" }),
    pseudonym: text("pseudonym").notNull(),
    pseudonymNormalized: text("pseudonym_normalized").notNull(),
    /** Codes aus kontrollierter Liste (src/lib/catalog.ts) */
    interests: text("interests").array().notNull().default(sql`'{}'::text[]`),
    /** Optional, ausdrücklich als sichtbar gekennzeichnet (Kantonskürzel) */
    canton: text("canton"),
    discoverable: boolean("discoverable").notNull().default(true),
    onboardingGoal: text("onboarding_goal"),
    onboardingCompletedAt: ts("onboarding_completed_at"),
    rulesAcceptedVersion: text("rules_accepted_version"),
    rulesAcceptedAt: ts("rules_accepted_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    version: version(),
  },
  (t) => [uniqueIndex("community_profiles_pseudonym_uq").on(t.pseudonymNormalized)],
);

export const userPreferences = identity.table("user_preferences", {
  accountId: uuid("account_id")
    .primaryKey()
    .references(() => accounts.id, { onDelete: "cascade" }),
  locale: text("locale").notNull().default("de-CH"),
  timezone: text("timezone").notNull().default("Europe/Zurich"),
  simpleView: boolean("simple_view").notNull().default(false),
  /** Prozent: 100, 112, 125, 150 */
  textScale: smallint("text_scale").notNull().default(100),
  /** system | reduce | allow */
  motion: text("motion").notNull().default("system"),
  /** system | light | dark */
  theme: text("theme").notNull().default("system"),
  emailSocial: boolean("email_social").notNull().default(false),
  /** Liste der aktivierten In-App-Ereignistypen */
  inAppTypes: text("in_app_types")
    .array()
    .notNull()
    .default(sql`'{contact_request,contact_accepted,comment_reply,group_decision,new_message,moderation_decision}'::text[]`),
  quietStart: text("quiet_start").notNull().default("20:00"),
  quietEnd: text("quiet_end").notNull().default("08:00"),
  pausedUntil: ts("paused_until"),
  updatedAt: updatedAt(),
  version: version(),
});

/** Versionierte Nachweise, nie ein überschriebenes Boolean (PRD 09). */
export const consentRecords = identity.table(
  "consent_records",
  {
    id: id(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    purpose: consentPurpose("purpose").notNull(),
    textVersion: text("text_version").notNull(),
    decision: consentDecision("decision").notNull(),
    channel: text("channel").notNull().default("web"),
    decidedAt: ts("decided_at").notNull().defaultNow(),
  },
  (t) => [index("consent_records_account_idx").on(t.accountId, t.purpose, t.decidedAt)],
);
