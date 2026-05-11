export type TMode = 'skip' | 'update';

export type TMigrationOptions = {
  readonly mode: TMode;
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
  readonly fatalError?: string;
  readonly startedAt: number;
  readonly finishedAt?: number;
};

export type TUiPhase = 'idle' | 'uploading' | 'running' | 'done' | 'error';
