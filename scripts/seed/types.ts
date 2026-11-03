import type { drizzle } from "drizzle-orm/postgres-js";
import type * as schema from "../../src/server/db/schema";

export type SeedDb = ReturnType<typeof drizzle<typeof schema>>;

/** Von core.ts angelegte Konten (fiktive Demo-Konten, keine echten Personen). */
export type SeedContext = {
  db: SeedDb;
  staff: {
    admin: string;
    editor: string;
    reviewer: string;
    moderator: string;
    lead: string;
    privacy: string;
    /** Zweite Person der Datenschutzstelle (Vieraugenprinzip, ACC05) */
    privacy2: string;
    ops: string;
  };
  /** Fiktive Mitglieder für Tests (Pseudonyme) */
  members: { id: string; pseudonym: string }[];
};
