export type OutboxJob = {
  id: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  attempt: number;
};

export type Handler = (job: OutboxJob) => Promise<void>;

export type PeriodicTask = { name: string; everyMs: number; run: () => Promise<void> };
