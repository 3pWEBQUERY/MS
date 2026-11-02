import type { Handler, PeriodicTask } from "../types";

/**
 * Export und Löschung (PRI03–PRI06) – wird vom Datenschutz-Modul implementiert.
 * Typen: "export.generate", "erasure.health", "erasure.account"
 */
export const privacyHandlers: Record<string, Handler> = {};

export const privacyTasks: PeriodicTask[] = [];
