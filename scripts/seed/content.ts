import type { SeedContext } from "./types";

/** Seed für das Modul «content» – wird vom zuständigen Modul implementiert. Muss idempotent sein. */
export async function seedContent(ctx: SeedContext): Promise<void> {
  void ctx;
}
