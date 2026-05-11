import React, { useCallback } from 'react';
import type { TJobState, TFailedItem, TPhotoFailedItem } from '../types';
import { buildAdminFilterUrl, classifyError } from '../lib/errorClassifier';
import { buildFailuresCsv, downloadCsv } from '../lib/csvExport';

type TProps = { readonly job: TJobState };

const sectionStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #f5d4d1',
  borderLeft: '4px solid #d02b20',
  borderRadius: 6,
  padding: 14,
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
};

const photoSectionStyle: React.CSSProperties = {
  ...sectionStyle,
  borderColor: '#ffd590',
  borderLeftColor: '#b86e00',
};

const itemStyle: React.CSSProperties = {
  border: '1px solid #eaeaef',
  borderRadius: 4,
  padding: 10,
  background: '#fafafb',
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
};

const articleStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: '#32324d',
  fontFamily: 'ui-monospace, monospace',
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 13,
  color: '#d02b20',
  fontWeight: 600,
};

const hintStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 12,
  color: '#32324d',
  lineHeight: 1.5,
};

const detailsStyle: React.CSSProperties = {
  fontSize: 11,
  fontFamily: 'ui-monospace, monospace',
  color: '#666',
  background: '#fff',
  padding: 6,
  borderRadius: 3,
  border: '1px solid #eaeaef',
  margin: 0,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
};

const linkStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#4945ff',
  textDecoration: 'none',
};

const metaRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 6,
  flexWrap: 'wrap',
  fontSize: 11,
  color: '#666',
};

const metaPillStyle: React.CSSProperties = {
  padding: '2px 8px',
  background: '#eaeaef',
  borderRadius: 10,
  fontFamily: 'ui-monospace, monospace',
};

// inputs single failed item, does render article + classified error + admin link + full context, returns JSX
const FailedRow: React.FC<{ readonly item: TFailedItem }> = ({ item }) => {
  const { title, hint } = classifyError(item.error);
  const adminUrl = buildAdminFilterUrl(item.article);
  const ctx = item.context;
  return (
    <div style={itemStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={articleStyle}>{item.article}</span>
        <a href={adminUrl} target="_blank" rel="noopener noreferrer" style={linkStyle}>
          → Знайти в Content Manager
        </a>
      </div>
      <p style={titleStyle}>{title}</p>
      <p style={hintStyle}>{hint}</p>
      {ctx ? (
        <div style={metaRowStyle}>
          <span style={metaPillStyle}>op: {ctx.operation}</span>
          {ctx.slug ? <span style={metaPillStyle}>slug: {ctx.slug}</span> : null}
          {ctx.errorName ? <span style={metaPillStyle}>{ctx.errorName}</span> : null}
        </div>
      ) : null}
      <details>
        <summary style={{ fontSize: 11, color: '#666', cursor: 'pointer' }}>Технічні деталі</summary>
        <p style={{ ...detailsStyle, marginTop: 4 }}>{item.error}</p>
        {ctx?.errorDetails ? (
          <p style={{ ...detailsStyle, marginTop: 4 }}>
            details: {JSON.stringify(ctx.errorDetails, null, 2)}
          </p>
        ) : null}
        {ctx?.stack ? (
          <p style={{ ...detailsStyle, marginTop: 4, fontSize: 10 }}>{ctx.stack}</p>
        ) : null}
      </details>
    </div>
  );
};

// inputs single photo failed item, does render article + Drive link + hint + stage, returns JSX
const PhotoFailedRow: React.FC<{ readonly item: TPhotoFailedItem }> = ({ item }) => {
  const { title, hint } = classifyError(item.error);
  const adminUrl = buildAdminFilterUrl(item.article);
  const ctx = item.context;
  return (
    <div style={itemStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={articleStyle}>{item.article}</span>
        <a href={adminUrl} target="_blank" rel="noopener noreferrer" style={linkStyle}>
          → Знайти товар
        </a>
      </div>
      <p style={{ ...titleStyle, color: '#b86e00' }}>{title}</p>
      <p style={hintStyle}>{hint}</p>
      <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ ...linkStyle, fontSize: 11 }}>
        🔗 Відкрити в Google Drive
      </a>
      {ctx ? (
        <div style={metaRowStyle}>
          {ctx.stage ? <span style={metaPillStyle}>stage: {ctx.stage}</span> : null}
          {ctx.errorName ? <span style={metaPillStyle}>{ctx.errorName}</span> : null}
        </div>
      ) : null}
      <details>
        <summary style={{ fontSize: 11, color: '#666', cursor: 'pointer' }}>Технічні деталі</summary>
        <p style={{ ...detailsStyle, marginTop: 4 }}>{item.error}</p>
        {ctx?.stack ? (
          <p style={{ ...detailsStyle, marginTop: 4, fontSize: 10 }}>{ctx.stack}</p>
        ) : null}
      </details>
    </div>
  );
};

// inputs job state, does render two sections with failures + CSV export button, returns JSX or null
const FailureReport: React.FC<TProps> = ({ job }) => {
  const handleExport = useCallback(() => {
    const csv = buildFailuresCsv(job.failed, job.photoFailed);
    downloadCsv(csv, `migration-failures-${job.jobId}.csv`);
  }, [job]);

  if (job.failed.length === 0 && job.photoFailed.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {job.failed.length > 0 ? (
        <div style={sectionStyle}>
          <h3 style={{ margin: 0, fontSize: 14, color: '#d02b20' }}>
            Не створено / не оновлено: {job.failed.length}
          </h3>
          <p style={{ margin: 0, fontSize: 12, color: '#666' }}>
            Ці артикули потребують ручної уваги. Натисніть «Знайти в Content Manager» щоб відкрити фільтр по артикулу.
          </p>
          {job.failed.map((f, i) => <FailedRow key={i} item={f} />)}
        </div>
      ) : null}

      {job.photoFailed.length > 0 ? (
        <div style={photoSectionStyle}>
          <h3 style={{ margin: 0, fontSize: 14, color: '#b86e00' }}>
            Фото не завантажено: {job.photoFailed.length}
          </h3>
          <p style={{ margin: 0, fontSize: 12, color: '#666' }}>
            Товари створено/оновлено, але фото з Drive не пройшло. Додайте вручну через панель «Google Drive» на сторінці товару.
          </p>
          {job.photoFailed.map((f, i) => <PhotoFailedRow key={i} item={f} />)}
        </div>
      ) : null}

      <button
        type="button"
        onClick={handleExport}
        style={{
          padding: '8px 14px',
          background: '#32324d',
          color: '#fff',
          border: 'none',
          borderRadius: 4,
          cursor: 'pointer',
          fontSize: 12,
          fontWeight: 600,
          alignSelf: 'flex-start',
        }}
      >
        Скачати помилки як CSV
      </button>
    </div>
  );
};

export default FailureReport;
