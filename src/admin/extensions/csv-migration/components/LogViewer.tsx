import React, { useEffect, useRef } from 'react';

type TProps = {
  readonly logs: readonly string[];
  readonly autoScroll?: boolean;
};

// inputs logs array, does render scrollable monospace box, returns JSX
const LogViewer: React.FC<TProps> = ({ logs, autoScroll = true }) => {
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!autoScroll || !boxRef.current) return;
    boxRef.current.scrollTop = boxRef.current.scrollHeight;
  }, [logs, autoScroll]);

  return (
    <div
      ref={boxRef}
      style={{
        height: 240,
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
