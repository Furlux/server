import { useCallback, useEffect, useRef, useState } from 'react';
import { getFetchClient } from '@strapi/strapi/admin';
import type { TJobState, TMigrationOptions, TUiPhase } from '../types';

const POLL_INTERVAL_MS = 10 * 1000;
const UPLOAD_TIMEOUT_MS = 5 * 60 * 1000;
const JOB_ID_PARAM = 'jobId';

type TFetchClient = ReturnType<typeof getFetchClient>;

type TStartResponse = {
  success: boolean;
  jobId: string;
  total: number;
};

export type TUploadProgress = {
  readonly stage: 'reading' | 'compressing' | 'encoding' | 'sending' | 'parsing';
  readonly fileName: string;
  readonly fileSize: number;
  readonly compressedSize?: number;
};

// inputs nothing, does read jobId from current URL query, returns string or null
const getJobIdFromUrl = (): string | null => {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get(JOB_ID_PARAM);
};

// inputs jobId or null, does write/remove jobId in URL via replaceState, returns void
const setJobIdInUrl = (jobId: string | null): void => {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (jobId) {
    url.searchParams.set(JOB_ID_PARAM, jobId);
  } else {
    url.searchParams.delete(JOB_ID_PARAM);
  }
  window.history.replaceState(null, '', url.toString());
};

// inputs Blob, does base64 encode via FileReader, returns Promise<string>
const blobToBase64 = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
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
  reader.readAsDataURL(blob);
});

// inputs File, does gzip-compress via CompressionStream, returns Promise<Blob>
const gzipFile = async (file: File): Promise<Blob> => {
  if (typeof (globalThis as { CompressionStream?: unknown }).CompressionStream === 'undefined') {
    throw new Error('Браузер не підтримує CompressionStream — оновіть Chrome/Firefox/Safari');
  }
  const stream = file.stream().pipeThrough(new CompressionStream('gzip'));
  return new Response(stream).blob();
};

// inputs ms, does sleep then reject with timeout error, returns Promise<never>
const timeoutPromise = (ms: number): Promise<never> =>
  new Promise((_, reject) => setTimeout(() => reject(new Error(`Час очікування вичерпано (${ms / 1000}s)`)), ms));

export type TMigrationJobState = {
  readonly phase: TUiPhase;
  readonly job: TJobState | null;
  readonly error: string | null;
  readonly upload: TUploadProgress | null;
  readonly isResuming: boolean;
};

export type TMigrationJobApi = {
  readonly state: TMigrationJobState;
  readonly start: (file: File, options: TMigrationOptions) => Promise<void>;
  readonly reset: () => void;
};

// inputs nothing, does manage CSV migration lifecycle with polling + URL persistence, returns api
export const useMigrationJob = (): TMigrationJobApi => {
  const [phase, setPhase] = useState<TUiPhase>('idle');
  const [job, setJob] = useState<TJobState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [upload, setUpload] = useState<TUploadProgress | null>(null);
  const [isResuming, setIsResuming] = useState(false);
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
      setIsResuming(false);
      if (data.status === 'completed' || data.status === 'failed') {
        stopPolling();
        setPhase('done');
      }
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      if (err.response?.status === 404) {
        stopPolling();
        setError('Цю міграцію вже не знайти на сервері (минув час зберігання або сервер перезавантажився). Запустіть нову.');
        setPhase('error');
        setIsResuming(false);
        setJobIdInUrl(null);
      }
    }
  }, [stopPolling]);

  const beginPolling = useCallback((jobId: string): void => {
    if (pollTimer.current) clearInterval(pollTimer.current);
    void fetchStatus(jobId);
    pollTimer.current = setInterval(() => {
      void fetchStatus(jobId);
    }, POLL_INTERVAL_MS);
  }, [fetchStatus]);

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
    setUpload({ stage: 'reading', fileName: file.name, fileSize: file.size });

    try {
      setUpload({ stage: 'compressing', fileName: file.name, fileSize: file.size });
      const gzipBlob = await gzipFile(file);
      const compressedSize = gzipBlob.size;

      setUpload({ stage: 'encoding', fileName: file.name, fileSize: file.size, compressedSize });
      const csvBase64 = await blobToBase64(gzipBlob);

      setUpload({ stage: 'sending', fileName: file.name, fileSize: file.size, compressedSize });
      const postPromise = client.post<TStartResponse>('/api/csv-migration/start', {
        csvBase64,
        compressed: true,
        options,
      });
      const { data } = (await Promise.race([postPromise, timeoutPromise(UPLOAD_TIMEOUT_MS)])) as { data: TStartResponse };

      const jobId = data.jobId;
      setJobIdInUrl(jobId);
      setUpload(null);
      setPhase('running');
      beginPolling(jobId);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: { message?: string } }; status?: number }; message?: string };
      const isPayloadTooLarge = err.response?.status === 413 || /payload too large|request entity too large/i.test(err.message ?? '');
      const message = isPayloadTooLarge
        ? 'Файл занадто великий для серверу. Спробуйте розбити CSV на менші частини.'
        : err.response?.data?.error?.message ?? err.message ?? 'Помилка запуску міграції';
      setUpload(null);
      setError(message);
      setPhase('error');
    }
  }, [beginPolling]);

  const reset = useCallback(() => {
    stopPolling();
    setJob(null);
    setError(null);
    setUpload(null);
    setIsResuming(false);
    setPhase('idle');
    setJobIdInUrl(null);
  }, [stopPolling]);

  // On mount: if URL has a jobId param, resume polling for that job
  useEffect(() => {
    const existing = getJobIdFromUrl();
    if (!existing) return;
    setPhase('running');
    setIsResuming(true);
    beginPolling(existing);
    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  return { state: { phase, job, error, upload, isResuming }, start, reset };
};
