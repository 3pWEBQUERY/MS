import type { SeedContext } from "./types";

/** Seed für das Modul «health» – wird vom zuständigen Modul implementiert. Muss idempotent sein. */
export async function seedHealth(ctx: SeedContext): Promise<void> {
  void ctx;
}
