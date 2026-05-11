import React, { useCallback } from 'react';
import type { TJobState } from '../types';

type TProps = {
  readonly job: TJobState;
  readonly onReset: () => void;
};

// inputs job + reset cb, does render final summary + download JSON + new migration button, returns JSX
const ReportPanel: React.FC<TProps> = ({ job, onReset }) => {
  const elapsedSec = job.finishedAt ? ((job.finishedAt - job.startedAt) / 1000) : 0;
  const minutes = Math.floor(elapsedSec / 60);
  const seconds = Math.floor(elapsedSec % 60);
  const isFailed = job.status === 'failed';

  const handleDownload = useCallback(() => {
    const blob = new Blob([JSON.stringify(job, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `migration-report-${job.jobId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [job]);

  return (
    <div style={{
      padding: 16,
      borderRadius: 6,
      background: isFailed ? '#fff5f5' : '#f0fff4',
      border: `1px solid ${isFailed ? '#d02b20' : '#2f8132'}`,
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <h3 style={{ margin: 0, fontSize: 16, color: isFailed ? '#d02b20' : '#2f8132' }}>
        {isFailed ? 'Міграція завершилась з помилкою' : 'Міграція завершена'}
        {' • '}{minutes}хв {seconds}с
      </h3>

      {isFailed && job.fatalError ? (
        <p style={{ margin: 0, fontSize: 13, color: '#d02b20' }}>{job.fatalError}</p>
      ) : null}

      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: '#32324d' }}>
        <li>Створено: <b>{job.created}</b></li>
        <li>Оновлено: <b>{job.updated}</b></li>
        <li>Пропущено: <b>{job.skipped}</b></li>
        <li>Помилок створення: <b>{job.failed.length}</b></li>
        <li>Помилок фото: <b>{job.photoFailed.length}</b></li>
      </ul>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          onClick={handleDownload}
          style={{
            padding: '8px 14px',
            background: '#32324d',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Скачати JSON-звіт
        </button>
        <button
          type="button"
          onClick={onReset}
          style={{
            padding: '8px 14px',
            background: '#4945ff',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Нова міграція
        </button>
      </div>
    </div>
  );
};

export default ReportPanel;
