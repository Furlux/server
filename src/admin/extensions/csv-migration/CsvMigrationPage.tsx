import React, { useCallback, useState } from 'react';
import Dropzone from './components/Dropzone';
import RunOptions from './components/RunOptions';
import ProgressPanel from './components/ProgressPanel';
import LogViewer from './components/LogViewer';
import ReportPanel from './components/ReportPanel';
import UploadProgress from './components/UploadProgress';
import { useMigrationJob } from './hooks/useMigrationJob';
import type { TMigrationOptions } from './types';

const DEFAULT_OPTIONS: TMigrationOptions = {
  mode: 'skip',
  uploadPhotos: true,
  dryRun: false,
};

const containerStyle: React.CSSProperties = {
  padding: 24,
  maxWidth: 960,
  margin: '0 auto',
  display: 'flex',
  flexDirection: 'column',
  gap: 20,
};

const sectionStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #eaeaef',
  borderRadius: 8,
  padding: 20,
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
};

const headerStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 14,
  fontWeight: 600,
  color: '#32324d',
};

// inputs nothing, does render full CSV migration page with state machine, returns JSX
const CsvMigrationPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [options, setOptions] = useState<TMigrationOptions>(DEFAULT_OPTIONS);
  const { state, start, reset } = useMigrationJob();
  const { phase, job, error, upload } = state;

  const isWorking = phase === 'uploading' || phase === 'running';
  const isLocked = isWorking || phase === 'done';

  const handleStart = useCallback(() => {
    if (!file) return;
    void start(file, options);
  }, [file, options, start]);

  const handleReset = useCallback(() => {
    setFile(null);
    setOptions(DEFAULT_OPTIONS);
    reset();
  }, [reset]);

  return (
    <div style={containerStyle}>
      <div>
        <h1 style={{ margin: 0, fontSize: 24, color: '#32324d' }}>CSV Migration</h1>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: '#666' }}>
          Завантажте CSV з товарами — система розгрупує по артикулу та створить продукти у Strapi.
        </p>
      </div>

      <div style={sectionStyle}>
        <p style={headerStyle}>1. CSV-файл</p>
        <Dropzone file={file} disabled={isLocked} onFileSelected={setFile} />
      </div>

      <div style={sectionStyle}>
        <p style={headerStyle}>2. Опції</p>
        <RunOptions value={options} disabled={isLocked} onChange={setOptions} />
      </div>

      {phase === 'idle' || phase === 'error' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {error ? (
            <p style={{ margin: 0, fontSize: 13, color: '#d02b20' }}>{error}</p>
          ) : null}
          <button
            type="button"
            onClick={handleStart}
            disabled={!file}
            style={{
              padding: '12px 24px',
              background: file ? '#4945ff' : '#dcdce4',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: file ? 'pointer' : 'not-allowed',
              fontSize: 14,
              fontWeight: 600,
              alignSelf: 'flex-start',
            }}
          >
            Запустити міграцію
          </button>
        </div>
      ) : null}

      {phase === 'uploading' && upload ? (
        <div style={sectionStyle}>
          <p style={headerStyle}>Завантаження</p>
          <UploadProgress progress={upload} />
        </div>
      ) : null}

      {(phase === 'running' || phase === 'done') && job ? (
        <>
          <div style={sectionStyle}>
            <p style={headerStyle}>Прогрес</p>
            <ProgressPanel job={job} />
          </div>
          <div style={sectionStyle}>
            <p style={headerStyle}>Лог</p>
            <LogViewer logs={job.logs} autoScroll={phase === 'running'} />
          </div>
        </>
      ) : null}

      {phase === 'done' && job ? (
        <ReportPanel job={job} onReset={handleReset} />
      ) : null}
    </div>
  );
};

export default CsvMigrationPage;
