import React, { useEffect, useRef, useState } from 'react';
import type { TJobState } from '../types';

type TProps = { readonly job: TJobState };

const COUNT_DURATION_MS = 800;
const ETA_MIN_PROGRESS = 0.02;

const chipBase: React.CSSProperties = {
  display: 'inline-block',
  padding: '6px 12px',
  borderRadius: 14,
  fontSize: 13,
  fontWeight: 600,
  color: '#fff',
  minWidth: 80,
  textAlign: 'center',
  fontVariantNumeric: 'tabular-nums',
};

// inputs target number + duration, does animate from previous value with ease-out, returns current displayed value
const useCountUp = (target: number, durationMs = COUNT_DURATION_MS): number => {
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);
  const startRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === display) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    fromRef.current = display;
    startRef.current = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(fromRef.current + (target - fromRef.current) * eased);
      setDisplay(current);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, durationMs, display]);

  return display;
};

type TChipProps = {
  readonly label: string;
  readonly value: number;
  readonly color: string;
};

// inputs label/value/color, does render chip with count-up animated number, returns JSX
const CounterChip: React.FC<TChipProps> = ({ label, value, color }) => {
  const animated = useCountUp(value);
  return (
    <span style={{ ...chipBase, background: color }}>
      {label}: {animated.toLocaleString('uk-UA')}
    </span>
  );
};

// inputs total ms, does format as human duration in Ukrainian, returns string
const formatDuration = (ms: number): string => {
  if (!Number.isFinite(ms) || ms <= 0) return '<1 хв';
  const totalSec = Math.round(ms / 1000);
  if (totalSec < 60) return '<1 хв';
  const totalMin = Math.round(totalSec / 60);
  if (totalMin < 60) return `~${totalMin} хв`;
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  return mins > 0 ? `~${hours} год ${mins} хв` : `~${hours} год`;
};

// inputs job state, does compute ETA string based on rate so far, returns string or null
const computeEta = (job: TJobState): string | null => {
  if (job.status !== 'running') return null;
  if (job.processed === 0 || job.total === 0) return 'Обчислення часу...';
  const progress = job.processed / job.total;
  if (progress < ETA_MIN_PROGRESS) return 'Обчислення часу...';
  const elapsed = Date.now() - job.startedAt;
  const estimatedTotal = elapsed / progress;
  const remaining = estimatedTotal - elapsed;
  return `Залишилось ${formatDuration(remaining)}`;
};

// inputs job state, does render progress bar + animated counters + ETA, returns JSX
const ProgressPanel: React.FC<TProps> = ({ job }) => {
  const animatedProcessed = useCountUp(job.processed, COUNT_DURATION_MS);
  const percent = job.total > 0 ? Math.round((job.processed / job.total) * 100) : 0;
  const elapsed = ((job.finishedAt ?? Date.now()) - job.startedAt) / 1000;
  const minutes = Math.floor(elapsed / 60);
  const seconds = Math.floor(elapsed % 60);
  const eta = computeEta(job);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
        <p style={{ margin: '8px 0 0', fontSize: 13, color: '#32324d', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
          {animatedProcessed.toLocaleString('uk-UA')} / {job.total.toLocaleString('uk-UA')}
          <span style={{ color: '#666', marginLeft: 8 }}>({percent}%)</span>
          <span style={{ color: '#666', marginLeft: 8 }}>•</span>
          <span style={{ color: '#666', marginLeft: 8 }}>{minutes}хв {seconds}с</span>
          {eta ? (
            <>
              <span style={{ color: '#666', marginLeft: 8 }}>•</span>
              <span style={{ color: '#4945ff', marginLeft: 8, fontWeight: 600 }}>{eta}</span>
            </>
          ) : null}
        </p>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        <CounterChip label="Created" value={job.created} color="#2f8132" />
        <CounterChip label="Updated" value={job.updated} color="#0c75af" />
        <CounterChip label="Unchanged" value={job.unchanged} color="#6c7280" />
        <CounterChip label="Skipped" value={job.skipped} color="#8e8ea9" />
        <CounterChip label="Failed" value={job.failed.length} color="#d02b20" />
        <CounterChip label="Photo fail" value={job.photoFailed.length} color="#b86e00" />
      </div>
    </div>
  );
};

export default ProgressPanel;
