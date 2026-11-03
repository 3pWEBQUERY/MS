import { emailHandlers } from "./handlers/email";
import { maintenanceTasks } from "./handlers/maintenance";
import { notificationHandlers, notificationTasks } from "./handlers/notifications";
import { privacyHandlers, privacyTasks } from "./handlers/privacy";
import { contentTasks } from "./handlers/content";
import { moderationTasks } from "./handlers/moderation";
import { analyticsTasks } from "./handlers/analytics";
import { opsTasks } from "./handlers/ops";
import type { Handler, PeriodicTask } from "./types";

/** Zuordnung Outbox-Typ → Handler. Jedes Fachmodul pflegt seine eigene Datei. */
export const HANDLERS: Record<string, Handler> = {
  ...emailHandlers,
  ...notificationHandlers,
  ...privacyHandlers,
};

export const PERIODIC: PeriodicTask[] = [...maintenanceTasks, ...notificationTasks, ...privacyTasks, ...contentTasks, ...moderationTasks, ...analyticsTasks, ...opsTasks];
