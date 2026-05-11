import React, { useEffect, useRef, useState } from 'react';
import type { TJobState } from '../types';

type TProps = { readonly job: TJobState };

const bumpKeyframes = `
@keyframes csv-migration-bump {
  0% { transform: scale(1); }
  40% { transform: scale(1.18); filter: brightness(1.25); }
  100% { transform: scale(1); }
}
`;

const chipBase: React.CSSProperties = {
  display: 'inline-block',
  padding: '6px 12px',
  borderRadius: 14,
  fontSize: 13,
  fontWeight: 600,
  color: '#fff',
  minWidth: 80,
  textAlign: 'center',
  transformOrigin: 'center',
};

// inputs current value, does detect changes and trigger bump animation, returns nonce string
const useChangeNonce = (value: number): string => {
  const [nonce, setNonce] = useState('');
  const prev = useRef(value);
  useEffect(() => {
    if (value !== prev.current) {
      prev.current = value;
      setNonce(`n-${value}-${Date.now()}`);
    }
  }, [value]);
  return nonce;
};

type TChipProps = {
  readonly label: string;
  readonly value: number;
  readonly color: string;
};

// inputs label/value/color, does render animated chip that bumps on value change, returns JSX
const CounterChip: React.FC<TChipProps> = ({ label, value, color }) => {
  const nonce = useChangeNonce(value);
  return (
    <span
      key={nonce}
      style={{
        ...chipBase,
        background: color,
        animation: nonce ? 'csv-migration-bump 0.5s ease-out' : undefined,
      }}
    >
      {label}: {value}
    </span>
  );
};

// inputs job state, does render progress bar + animated counters, returns JSX
const ProgressPanel: React.FC<TProps> = ({ job }) => {
  const percent = job.total > 0 ? Math.round((job.processed / job.total) * 100) : 0;
  const elapsed = ((job.finishedAt ?? Date.now()) - job.startedAt) / 1000;
  const minutes = Math.floor(elapsed / 60);
  const seconds = Math.floor(elapsed % 60);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <style>{bumpKeyframes}</style>
      <div>
        <div style={{
          width: '100%', height: 16, background: '#eaeaef', borderRadius: 8, overflow: 'hidden',
        }}>
          <div style={{
            width: `${percent}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #4945ff, #7b78ff)',
            borderRadius: 8,
            transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
          }} />
        </div>
        <p style={{ margin: '8px 0 0', fontSize: 13, color: '#32324d', fontWeight: 500 }}>
          {job.processed.toLocaleString('uk-UA')} / {job.total.toLocaleString('uk-UA')}
          <span style={{ color: '#666', marginLeft: 8 }}>({percent}%)</span>
          <span style={{ color: '#666', marginLeft: 8 }}>•</span>
          <span style={{ color: '#666', marginLeft: 8 }}>{minutes}хв {seconds}с</span>
        </p>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        <CounterChip label="Created" value={job.created} color="#2f8132" />
        <CounterChip label="Updated" value={job.updated} color="#0c75af" />
        <CounterChip label="Skipped" value={job.skipped} color="#8e8ea9" />
        <CounterChip label="Failed" value={job.failed.length} color="#d02b20" />
        <CounterChip label="Photo fail" value={job.photoFailed.length} color="#b86e00" />
      </div>
    </div>
  );
};

export default ProgressPanel;
