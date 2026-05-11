export type TMode = 'skip' | 'update';

export type TMigrationOptions = {
  readonly mode: TMode;
  readonly dryRun: boolean;
};

export type TFailedContext = {
  readonly operation: 'CREATE' | 'UPDATE' | 'LOOKUP';
  readonly slug?: string;
  readonly title?: string;
  readonly errorName?: string;
  readonly errorDetails?: unknown;
  readonly stack?: string;
};

export type TPhotoFailedContext = {
  readonly errorName?: string;
  readonly stack?: string;
  readonly stage?: 'download' | 'convert' | 'upload' | 'attach' | 'unknown';
};

export type TFailedItem = {
  readonly article: string;
  readonly error: string;
  readonly context?: TFailedContext;
};

export type TPhotoFailedItem = {
  readonly article: string;
  readonly url: string;
  readonly error: string;
  readonly context?: TPhotoFailedContext;
};

export type TJobStatus = 'pending' | 'running' | 'completed' | 'failed';

export type TTimingBucket = {
  readonly count: number;
  readonly totalMs: number;
};

export type TJobTimings = {
  readonly lookup: TTimingBucket;
  readonly create: TTimingBucket;
  readonly update: TTimingBucket;
  readonly photo: TTimingBucket;
};

export type TJobState = {
  readonly jobId: string;
  readonly status: TJobStatus;
  readonly options: TMigrationOptions;
  readonly total: number;
  readonly processed: number;
  readonly created: number;
  readonly updated: number;
  readonly skipped: number;
  readonly failed: readonly TFailedItem[];
  readonly photoFailed: readonly TPhotoFailedItem[];
  readonly logs: readonly string[];
  readonly timings?: TJobTimings;
  readonly fatalError?: string;
  readonly startedAt: number;
  readonly finishedAt?: number;
};

export type TUiPhase = 'idle' | 'uploading' | 'running' | 'done' | 'error';
