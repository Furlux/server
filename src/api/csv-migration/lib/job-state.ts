export type TMigrationOptions = {
  readonly mode: 'skip' | 'update';
  readonly dryRun: boolean;
};

export type TFailedItem = {
  readonly article: string;
  readonly error: string;
};

export type TPhotoFailedItem = {
  readonly article: string;
  readonly url: string;
  readonly error: string;
};

export type TJobStatus = 'pending' | 'running' | 'completed' | 'failed';

export type TJobState = {
  jobId: string;
  status: TJobStatus;
  options: TMigrationOptions;
  total: number;
  processed: number;
  created: number;
  updated: number;
  skipped: number;
  failed: TFailedItem[];
  photoFailed: TPhotoFailedItem[];
  logs: string[];
  fatalError?: string;
  startedAt: number;
  finishedAt?: number;
};

const MAX_LOGS = 20000;
const STALE_AFTER_MS = 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 30 * 60 * 1000;

const store = new Map<string, TJobState>();

// inputs jobId + options, does create new pending job, returns job state
export const createJob = (jobId: string, options: TMigrationOptions): TJobState => {
  const job: TJobState = {
    jobId,
    status: 'pending',
    options,
    total: 0,
    processed: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    failed: [],
    photoFailed: [],
    logs: [],
    startedAt: Date.now(),
  };
  store.set(jobId, job);
  return job;
};

// inputs jobId, does lookup job by id, returns job state or undefined
export const getJob = (jobId: string): TJobState | undefined => store.get(jobId);

// inputs jobId, does delete job entry, returns boolean
export const deleteJob = (jobId: string): boolean => store.delete(jobId);

// inputs job + log line, does append with rolling buffer cap, returns void
export const pushLog = (job: TJobState, line: string): void => {
  job.logs.push(line);
  if (job.logs.length > MAX_LOGS) {
    job.logs.splice(0, job.logs.length - MAX_LOGS);
  }
};

// inputs nothing, does remove stale finished jobs, returns count removed
const cleanupStaleJobs = (): number => {
  const now = Date.now();
  let removed = 0;
  for (const [id, job] of store.entries()) {
    if (job.finishedAt && now - job.finishedAt > STALE_AFTER_MS) {
      store.delete(id);
      removed += 1;
    }
  }
  return removed;
};

let cleanupTimer: NodeJS.Timeout | null = null;

// inputs nothing, does start interval to purge stale jobs, returns void
export const startCleanupInterval = (): void => {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    cleanupStaleJobs();
  }, CLEANUP_INTERVAL_MS);
  cleanupTimer.unref?.();
};

// inputs nothing, does stop the cleanup interval, returns void
export const stopCleanupInterval = (): void => {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
};
