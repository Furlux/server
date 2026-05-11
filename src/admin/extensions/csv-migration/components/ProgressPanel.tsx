import React from 'react';
import type { TJobState } from '../types';

type TProps = { readonly job: TJobState };

const counterChip = (label: string, n: number, color: string): React.ReactElement => (
  <span
    style={{
      display: 'inline-block',
      padding: '4px 10px',
      borderRadius: 12,
      fontSize: 12,
      fontWeight: 600,
      color: '#fff',
      background: color,
    }}
  >
    {label}: {n}
  </span>
);

// inputs job state, does render progress bar + counters, returns JSX
const ProgressPanel: React.FC<TProps> = ({ job }) => {
  const percent = job.total > 0 ? Math.round((job.processed / job.total) * 100) : 0;
  const elapsed = ((job.finishedAt ?? Date.now()) - job.startedAt) / 1000;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <div style={{
          width: '100%', height: 14, background: '#eaeaef', borderRadius: 7, overflow: 'hidden',
        }}>
          <div style={{
            width: `${percent}%`, height: '100%', background: '#4945ff', transition: 'width 0.3s ease',
          }} />
        </div>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: '#32324d' }}>
          {job.processed} / {job.total} ({percent}%) • {elapsed.toFixed(0)}s
        </p>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {counterChip('Created', job.created, '#2f8132')}
        {counterChip('Updated', job.updated, '#0c75af')}
        {counterChip('Skipped', job.skipped, '#8e8ea9')}
        {counterChip('Failed', job.failed.length, '#d02b20')}
        {counterChip('Photo fail', job.photoFailed.length, '#b86e00')}
      </div>
    </div>
  );
};

export default ProgressPanel;
