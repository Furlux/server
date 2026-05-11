import React from 'react';
import type { TMigrationOptions, TMode } from '../types';

type TProps = {
  readonly value: TMigrationOptions;
  readonly disabled?: boolean;
  readonly onChange: (next: TMigrationOptions) => void;
};

const labelStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 13,
  cursor: 'pointer',
};

// inputs options value/onChange, does render radio for mode + dry-run checkbox, returns JSX
const RunOptions: React.FC<TProps> = ({ value, disabled, onChange }) => {
  const setMode = (mode: TMode) => onChange({ ...value, mode });
  const setDryRun = (dryRun: boolean) => onChange({ ...value, dryRun });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600, color: '#32324d' }}>
          Поведінка з існуючими артикулами:
        </p>
        <div style={{ display: 'flex', gap: 16 }}>
          <label style={labelStyle}>
            <input
              type="radio"
              name="csv-mode"
              checked={value.mode === 'skip'}
              disabled={disabled}
              onChange={() => setMode('skip')}
            />
            Skip (пропустити дублікати — нічого не чіпаємо)
          </label>
          <label style={labelStyle}>
            <input
              type="radio"
              name="csv-mode"
              checked={value.mode === 'update'}
              disabled={disabled}
              onChange={() => setMode('update')}
            />
            Update (оновити текстові поля, фото не чіпаємо)
          </label>
        </div>
      </div>

      <p style={{ margin: 0, fontSize: 12, color: '#666', lineHeight: 1.5 }}>
        Фото з Google Drive (колонка "Для Михаила") додаються <b>тільки для нових продуктів</b>.
        В існуючих продуктах фото ніколи не перезаписуються.
      </p>

      <label style={labelStyle}>
        <input
          type="checkbox"
          checked={value.dryRun}
          disabled={disabled}
          onChange={(e) => setDryRun(e.target.checked)}
        />
        Dry-run (без запису в БД, тільки лог)
      </label>
    </div>
  );
};

export default RunOptions;
