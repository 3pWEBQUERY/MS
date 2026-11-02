import type { PeriodicTask } from "../types";

/**
 * Redaktionelle Fristen (CON03, CON05) – wird vom Inhalts-Modul implementiert:
 * überfällige Artikel zurückziehen, abgelaufene Angebote ausblenden.
 */
export const contentTasks: PeriodicTask[] = [];
