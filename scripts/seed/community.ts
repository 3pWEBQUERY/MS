import type { SeedContext } from "./types";

/** Seed für das Modul «community» – wird vom zuständigen Modul implementiert. Muss idempotent sein. */
export async function seedCommunity(ctx: SeedContext): Promise<void> {
  void ctx;
}
