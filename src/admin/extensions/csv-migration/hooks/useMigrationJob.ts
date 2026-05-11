import { useCallback, useEffect, useRef, useState } from 'react';
import { getFetchClient } from '@strapi/strapi/admin';
import type { TJobState, TMigrationOptions, TUiPhase } from '../types';

const POLL_INTERVAL_MS = 1000;

type TFetchClient = ReturnType<typeof getFetchClient>;

type TStartResponse = {
  success: boolean;
  jobId: string;
  total: number;
};

// inputs File, does read file as text and base64 encode, returns Promise<string>
const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => {
    const result = reader.result;
    if (typeof result !== 'string') {
      reject(new Error('FileReader did not return string'));
      return;
    }
    const commaIdx = result.indexOf(',');
    resolve(commaIdx >= 0 ? result.substring(commaIdx + 1) : result);
  };
  reader.onerror = () => reject(reader.error ?? new Error('FileReader error'));
  reader.readAsDataURL(file);
});

export type TMigrationJobState = {
  readonly phase: TUiPhase;
  readonly job: TJobState | null;
  readonly error: string | null;
};

export type TMigrationJobApi = {
  readonly state: TMigrationJobState;
  readonly start: (file: File, options: TMigrationOptions) => Promise<void>;
  readonly reset: () => void;
};

// inputs nothing, does manage CSV migration lifecycle with polling, returns api
export const useMigrationJob = (): TMigrationJobApi => {
  const [phase, setPhase] = useState<TUiPhase>('idle');
  const [job, setJob] = useState<TJobState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const clientRef = useRef<TFetchClient | null>(null);

  if (!clientRef.current) {
    clientRef.current = getFetchClient();
  }

  const stopPolling = useCallback(() => {
    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  }, []);

  const fetchStatus = useCallback(async (jobId: string): Promise<void> => {
    const client = clientRef.current;
    if (!client) return;
    try {
      const { data } = await client.get<TJobState>(`/api/csv-migration/status/${jobId}`);
      setJob(data);
      if (data.status === 'completed') {
        stopPolling();
        setPhase('done');
      } else if (data.status === 'failed') {
        stopPolling();
        setPhase('done');
      }
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      if (err.response?.status === 404) {
        stopPolling();
        setError('Джоб не знайдено — мабуть, сервер перезавантажився. Запустіть міграцію знову.');
        setPhase('error');
      }
    }
  }, [stopPolling]);

  const start = useCallback(async (file: File, options: TMigrationOptions): Promise<void> => {
    const client = clientRef.current;
    if (!client) {
      setError('Fetch клієнт не ініціалізовано');
      setPhase('error');
      return;
    }
    setError(null);
    setJob(null);
    setPhase('uploading');
    try {
      const csvBase64 = await fileToBase64(file);
      const { data } = await client.post<TStartResponse>('/api/csv-migration/start', {
        csvBase64,
        options,
      });
      const jobId = data.jobId;
      setPhase('running');
      await fetchStatus(jobId);
      pollTimer.current = setInterval(() => {
        void fetchStatus(jobId);
      }, POLL_INTERVAL_MS);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: { message?: string } } }; message?: string };
      const message = err.response?.data?.error?.message ?? err.message ?? 'Помилка запуску міграції';
      setError(message);
      setPhase('error');
    }
  }, [fetchStatus]);

  const reset = useCallback(() => {
    stopPolling();
    setJob(null);
    setError(null);
    setPhase('idle');
  }, [stopPolling]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  return { state: { phase, job, error }, start, reset };
};
