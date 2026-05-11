import React, { useCallback, useRef, useState } from 'react';

type TProps = {
  readonly file: File | null;
  readonly disabled?: boolean;
  readonly onFileSelected: (file: File | null) => void;
};

const ACCEPTED_MIME = ['text/csv', 'application/vnd.ms-excel', 'text/plain'];

// inputs file, does check size and extension for CSV, returns boolean ok
const isAcceptedFile = (file: File): boolean => {
  if (file.size === 0) return false;
  if (file.size > 5 * 1024 * 1024) return false;
  if (ACCEPTED_MIME.includes(file.type)) return true;
  return /\.csv$/i.test(file.name);
};

// inputs file selection callback, does render drag-drop zone + browse button, returns JSX
const Dropzone: React.FC<TProps> = ({ file, disabled, onFileSelected }) => {
  const [isOver, setIsOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFile = useCallback((f: File | null) => {
    if (!f) {
      onFileSelected(null);
      setError(null);
      return;
    }
    if (!isAcceptedFile(f)) {
      setError(`Не CSV або файл занадто великий (макс 5 МБ): ${f.name}`);
      return;
    }
    setError(null);
    onFileSelected(f);
  }, [onFileSelected]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsOver(false);
    if (disabled) return;
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }, [disabled, handleFile]);

  const handleClickBrowse = useCallback(() => {
    if (disabled) return;
    inputRef.current?.click();
  }, [disabled]);

  const handleClear = useCallback(() => {
    onFileSelected(null);
    if (inputRef.current) inputRef.current.value = '';
  }, [onFileSelected]);

  const borderColor = isOver ? '#4945ff' : (error ? '#d02b20' : '#dcdce4');
  const bg = isOver ? '#f0f0ff' : '#fff';

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setIsOver(true); }}
        onDragLeave={() => setIsOver(false)}
        onDrop={handleDrop}
        onClick={handleClickBrowse}
        style={{
          border: `2px dashed ${borderColor}`,
          borderRadius: 8,
          padding: 32,
          textAlign: 'center',
          background: bg,
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.15s ease',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        {file ? (
          <div>
            <p style={{ margin: 0, fontSize: 14, color: '#32324d', fontWeight: 600 }}>
              {file.name}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#666' }}>
              {(file.size / 1024).toFixed(1)} КБ
            </p>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleClear(); }}
              disabled={disabled}
              style={{
                marginTop: 12,
                padding: '4px 10px',
                background: 'transparent',
                border: '1px solid #dcdce4',
                borderRadius: 4,
                fontSize: 12,
                cursor: disabled ? 'not-allowed' : 'pointer',
              }}
            >
              Прибрати
            </button>
          </div>
        ) : (
          <div>
            <p style={{ margin: 0, fontSize: 14, color: '#32324d', fontWeight: 600 }}>
              Перетягніть CSV сюди
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#666' }}>
              або клікніть, щоб вибрати файл (макс 5 МБ)
            </p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv,application/vnd.ms-excel"
          disabled={disabled}
          style={{ display: 'none' }}
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />
      </div>
      {error ? (
        <p style={{ fontSize: 12, color: '#d02b20', margin: '8px 0 0' }}>{error}</p>
      ) : null}
    </div>
  );
};

export default Dropzone;
