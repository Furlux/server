import React from 'react';
import type { TJobState } from '../types';

type TProps = { readonly job: TJobState };

const pulseKeyframes = `
@keyframes csv-migration-ai-pulse {
  0% { opacity: 0.5; }
  50% { opacity: 1; }
  100% { opacity: 0.5; }
}
`;

const cardStyle: React.CSSProperties = {
  position: 'relative',
  padding: '16px 18px 18px',
  background: 'linear-gradient(135deg, #faf9ff 0%, #f0eeff 100%)',
  border: '1px solid #c8c6ff',
  borderRadius: 10,
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  overflow: 'hidden',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 14,
  fontWeight: 700,
  color: '#4945ff',
};

const bodyStyle: React.CSSProperties = {
  fontSize: 13,
  color: '#32324d',
  lineHeight: 1.6,
  whiteSpace: 'pre-wrap',
  margin: 0,
};

const footerStyle: React.CSSProperties = {
  marginTop: 4,
  fontSize: 11,
  color: '#888',
  fontStyle: 'italic',
};

// inputs job state, does render AI summary card based on aiSummaryStatus, returns JSX or null
const AiSummaryCard: React.FC<TProps> = ({ job }) => {
  const status = job.aiSummaryStatus;
  if (!status || status === 'disabled') return null;

  return (
    <div style={cardStyle}>
      <style>{pulseKeyframes}</style>
      <div style={headerStyle}>
        <span style={{ fontSize: 18 }}>🤖</span>
        <span>AI-аналіз міграції</span>
        {status === 'pending' ? (
          <span style={{
            marginLeft: 'auto',
            fontSize: 11,
            color: '#666',
            fontWeight: 400,
            animation: 'csv-migration-ai-pulse 1.5s ease-in-out infinite',
          }}>
            Gemini думає...
          </span>
        ) : null}
      </div>

      {status === 'pending' ? (
        <p style={{ ...bodyStyle, color: '#666', fontStyle: 'italic' }}>
          Чекаємо відповідь від Gemini (зазвичай 5-15 секунд)...
        </p>
      ) : null}

      {status === 'done' && job.aiSummary ? (
        <>
          <p style={bodyStyle}>{job.aiSummary}</p>
          <p style={footerStyle}>
            Згенеровано Google Gemini 2.0 Flash. Це автоматичний аналіз — використовуйте як підказку, а не як істину в останній інстанції.
          </p>
        </>
      ) : null}

      {status === 'failed' ? (
        <p style={{ ...bodyStyle, color: '#b86e00' }}>
          Не вдалось згенерувати AI-резюме: {job.aiSummaryError ?? 'невідома помилка'}.
          Це не вплинуло на саму міграцію — повний звіт і логи є нижче.
        </p>
      ) : null}
    </div>
  );
};

export default AiSummaryCard;
