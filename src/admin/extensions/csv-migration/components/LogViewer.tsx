import React, { useEffect, useRef, useState } from 'react';

type TProps = {
  readonly logs: readonly string[];
  readonly autoScroll?: boolean;
  readonly allowExpand?: boolean;
};

const COMPACT_HEIGHT = 240;
const EXPANDED_HEIGHT = 600;

// inputs logs array + autoScroll/allowExpand flags, does render scrollable log box + toggle, returns JSX
const LogViewer: React.FC<TProps> = ({ logs, autoScroll = true, allowExpand = false }) => {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!autoScroll || !boxRef.current) return;
    boxRef.current.scrollTop = boxRef.current.scrollHeight;
  }, [logs, autoScroll]);

  const height = expanded ? EXPANDED_HEIGHT : COMPACT_HEIGHT;

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
        fontSize: 12,
        color: '#666',
      }}>
        <span>Усього рядків: <b>{logs.length}</b></span>
        {allowExpand ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            style={{
              padding: '4px 10px',
              background: 'transparent',
              border: '1px solid #dcdce4',
              borderRadius: 4,
              fontSize: 11,
              cursor: 'pointer',
              color: '#32324d',
            }}
          >
            {expanded ? 'Згорнути' : 'Розгорнути'}
          </button>
        ) : null}
      </div>
      <div
        ref={boxRef}
        style={{
          height,
          overflowY: 'auto',
          background: '#1e1e2d',
          color: '#e6e6f0',
          padding: 12,
          borderRadius: 6,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          fontSize: 12,
          lineHeight: 1.5,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          transition: 'height 0.2s ease',
        }}
      >
        {logs.length === 0 ? (
          <p style={{ margin: 0, color: '#8e8ea9' }}>Очікування...</p>
        ) : (
          logs.map((line, i) => (
            <div key={i} style={{ color: lineColor(line) }}>
              {line}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// inputs log line, does pick color based on tag, returns hex string
const lineColor = (line: string): string => {
  if (line.includes('FAIL') || line.includes('FATAL')) return '#ff7a7a';
  if (line.includes('SKIP')) return '#b0b0c4';
  if (line.includes('UPDATED')) return '#7ac8ff';
  if (line.includes('CREATED')) return '#7aff7a';
  if (line.includes('DRY-RUN')) return '#ffe07a';
  if (line.includes('PHOTO FAIL')) return '#ffaa55';
  return '#e6e6f0';
};

export default LogViewer;
