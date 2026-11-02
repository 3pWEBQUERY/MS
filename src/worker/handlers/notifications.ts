import type { Handler, PeriodicTask } from "../types";

/**
 * Zustellung von Mitteilungen (MSG07, MSG08) – wird vom Messaging-Modul implementiert.
 * Typ: "notification.deliver"
 */
export const notificationHandlers: Record<string, Handler> = {};

export const notificationTasks: PeriodicTask[] = [];
