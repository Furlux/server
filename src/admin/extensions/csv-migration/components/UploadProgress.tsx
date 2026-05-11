import React from 'react';
import type { TUploadProgress } from '../hooks/useMigrationJob';

type TProps = { readonly progress: TUploadProgress };

const STAGE_LABEL: Record<TUploadProgress['stage'], string> = {
  reading: 'Читаємо файл...',
  compressing: 'Стискаємо CSV (gzip)...',
  encoding: 'Кодуємо в base64...',
  sending: 'Відправляємо на сервер...',
  parsing: 'Сервер парсить CSV...',
};

const indeterminateKeyframes = `
@keyframes csv-migration-indeterminate {
  0% { left: -40%; right: 100%; }
  60% { left: 100%; right: -10%; }
  100% { left: 100%; right: -10%; }
}
`;

// inputs progress object, does render file info + animated indeterminate bar + stage label, returns JSX
const UploadProgress: React.FC<TProps> = ({ progress }) => {
  const sizeKb = (progress.fileSize / 1024).toFixed(1);
  const compressedKb = progress.compressedSize ? (progress.compressedSize / 1024).toFixed(1) : null;
  const ratio = progress.compressedSize ? (progress.fileSize / progress.compressedSize).toFixed(1) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <style>{indeterminateKeyframes}</style>
      <div style={{ fontSize: 13, color: '#32324d', fontWeight: 600 }}>
        {progress.fileName} <span style={{ color: '#666', fontWeight: 400 }}>({sizeKb} КБ)</span>
      </div>
      {compressedKb ? (
        <p style={{ margin: 0, fontSize: 12, color: '#2f8132' }}>
          Після стиснення: <b>{compressedKb} КБ</b> (×{ratio} менше)
        </p>
      ) : null}
      <div style={{
        position: 'relative',
        width: '100%',
        height: 6,
        background: '#eaeaef',
        borderRadius: 3,
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          background: '#4945ff',
          borderRadius: 3,
          animation: 'csv-migration-indeterminate 1.5s ease-in-out infinite',
        }} />
      </div>
      <p style={{ margin: 0, fontSize: 12, color: '#666' }}>
        {STAGE_LABEL[progress.stage]}
      </p>
    </div>
  );
};

export default UploadProgress;
