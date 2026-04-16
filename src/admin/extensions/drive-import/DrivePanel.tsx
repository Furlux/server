import React, { useState } from 'react';
import { getFetchClient } from '@strapi/strapi/admin';

type TProps = {
  readonly documentId: string;
  readonly onDone: () => void;
};

// inputs documentId + onDone callback, does render URL input + upload flow, returns side panel content JSX
const DrivePanel: React.FC<TProps> = ({ documentId, onDone }) => {
  const [urls, setUrls] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const handleUpload = async () => {
    const list = urls
      .split('\n')
      .map((u) => u.trim())
      .filter(Boolean);

    if (list.length === 0) {
      setMessage({ text: 'Додайте хоча б одне посилання', isError: true });
      return;
    }
    if (!documentId) {
      setMessage({ text: 'Спочатку збережіть товар', isError: true });
      return;
    }

    setIsBusy(true);
    setMessage(null);

    const client = getFetchClient();
    let success = 0;
    const errors: string[] = [];

    for (const url of list) {
      try {
        await client.post('/api/upload-from-drive', { url, productDocumentId: documentId });
        success += 1;
      } catch (err: unknown) {
        const e = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
        errors.push(e.response?.data?.error?.message ?? e.message ?? 'невідома помилка');
      }
    }

    setIsBusy(false);

    if (errors.length === 0) {
      setMessage({ text: `Завантажено: ${success}. Оновіть сторінку.`, isError: false });
      setUrls('');
      onDone();
    } else {
      setMessage({
        text: `Завантажено: ${success}, помилок: ${errors.length}. ${errors.join('; ')}`,
        isError: true,
      });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>
        Вставте посилання Google Drive (одне на рядок). Файл повинен бути з доступом "Anyone with the link".
      </p>
      <textarea
        value={urls}
        onChange={(e) => setUrls(e.target.value)}
        placeholder="https://drive.google.com/file/d/.../view"
        rows={4}
        disabled={isBusy}
        style={{
          width: '100%',
          padding: '8px',
          border: '1px solid #dcdce4',
          borderRadius: '4px',
          fontSize: '12px',
          fontFamily: 'inherit',
          resize: 'vertical',
        }}
      />
      <button
        type="button"
        onClick={handleUpload}
        disabled={isBusy}
        style={{
          padding: '8px 12px',
          background: isBusy ? '#dcdce4' : '#4945ff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: isBusy ? 'not-allowed' : 'pointer',
          fontSize: '12px',
          fontWeight: 600,
        }}
      >
        {isBusy ? 'Завантаження...' : 'Імпортувати з Drive'}
      </button>
      {message ? (
        <p
          style={{
            fontSize: '12px',
            color: message.isError ? '#d02b20' : '#2f8132',
            margin: 0,
          }}
        >
          {message.text}
        </p>
      ) : null}
    </div>
  );
};

export default DrivePanel;
