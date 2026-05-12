import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getFetchClient } from '@strapi/strapi/admin';

const REQUIRED_CONFIRM = 'DELETE-ALL-PRODUCTS';

const cardStyle: React.CSSProperties = {
  background: '#fff5f5',
  border: '1px solid #f5b1ad',
  borderLeft: '4px solid #d02b20',
  borderRadius: 8,
  padding: 18,
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
};

const headerStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 14,
  fontWeight: 700,
  color: '#d02b20',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

const noteStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 12,
  color: '#32324d',
  lineHeight: 1.5,
};

const inputStyle: React.CSSProperties = {
  padding: '8px 10px',
  border: '1px solid #dcdce4',
  borderRadius: 4,
  fontSize: 13,
  fontFamily: 'ui-monospace, monospace',
  width: '100%',
  maxWidth: 320,
};

type TStatus = 'idle' | 'counting' | 'confirming' | 'purging' | 'done' | 'error';

// inputs nothing, does render danger-zone purge UI with type-to-confirm, returns JSX
const DangerZone: React.FC = () => {
  const [status, setStatus] = useState<TStatus>('idle');
  const [count, setCount] = useState<number | null>(null);
  const [confirmInput, setConfirmInput] = useState('');
  const [result, setResult] = useState<{ deleted: number; durationMs: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const clientRef = useRef(getFetchClient());

  const fetchCount = useCallback(async () => {
    setStatus('counting');
    setError(null);
    try {
      const { data } = await clientRef.current.get<{ count: number }>('/api/csv-migration/product-count');
      setCount(data.count);
      setStatus('confirming');
    } catch (e: unknown) {
      setError((e as Error).message ?? 'Не вдалось отримати кількість');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void fetchCount();
  }, [fetchCount]);

  const handlePurge = useCallback(async () => {
    setStatus('purging');
    setError(null);
    try {
      const { data } = await clientRef.current.post<{ deleted: number; durationMs: number }>(
        '/api/csv-migration/purge-products',
        { confirm: REQUIRED_CONFIRM },
      );
      setResult(data);
      setStatus('done');
      setConfirmInput('');
      setCount(0);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: { message?: string } } }; message?: string };
      setError(err.response?.data?.error?.message ?? err.message ?? 'Помилка purge');
      setStatus('error');
    }
  }, []);

  const canPurge = confirmInput === REQUIRED_CONFIRM && status === 'confirming' && (count ?? 0) > 0;

  return (
    <div style={cardStyle}>
      <h3 style={headerStyle}>
        <span style={{ fontSize: 18 }}>⚠️</span>
        Danger Zone — видалення всіх продуктів
      </h3>
      <p style={noteStyle}>
        Ця кнопка <b>назавжди</b> видаляє всі продукти з БД. Це незворотно (на Strapi Cloud рідко є бекапи свіжіше за добу).
        Використовуйте перед чистим re-import'ом міграції.
        Існуючі категорії, замовлення, користувачі та інші колекції <b>не торкаються</b>.
      </p>

      {status === 'counting' ? (
        <p style={noteStyle}>Рахуємо кількість продуктів...</p>
      ) : null}

      {count !== null && status !== 'done' ? (
        <p style={{ ...noteStyle, fontSize: 13, fontWeight: 600 }}>
          Зараз у БД: <b>{count.toLocaleString('uk-UA')}</b> продукт{count % 10 === 1 && count % 100 !== 11 ? '' : count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 12 || count % 100 > 14) ? 'и' : 'ів'}
        </p>
      ) : null}

      {(status === 'confirming' || status === 'purging') && (count ?? 0) > 0 ? (
        <>
          <p style={noteStyle}>
            Щоб підтвердити, введіть <code style={{ background: '#eaeaef', padding: '1px 6px', borderRadius: 3 }}>{REQUIRED_CONFIRM}</code>:
          </p>
          <input
            type="text"
            value={confirmInput}
            onChange={(e) => setConfirmInput(e.target.value)}
            disabled={status === 'purging'}
            placeholder={REQUIRED_CONFIRM}
            style={inputStyle}
          />
          <button
            type="button"
            onClick={handlePurge}
            disabled={!canPurge || status === 'purging'}
            style={{
              padding: '10px 18px',
              background: canPurge ? '#d02b20' : '#dcdce4',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: canPurge ? 'pointer' : 'not-allowed',
              fontSize: 13,
              fontWeight: 600,
              alignSelf: 'flex-start',
            }}
          >
            {status === 'purging' ? 'Видаляємо... зачекайте' : `Видалити всі ${count ?? 0} продуктів`}
          </button>
        </>
      ) : null}

      {status === 'done' && result ? (
        <div style={{
          padding: 10,
          background: '#f0fff4',
          border: '1px solid #b8e6c1',
          borderRadius: 4,
        }}>
          <p style={{ margin: 0, fontSize: 13, color: '#2f8132', fontWeight: 600 }}>
            ✓ Видалено: <b>{result.deleted}</b> продукт{result.deleted % 10 === 1 && result.deleted % 100 !== 11 ? '' : 'ів'} за {(result.durationMs / 1000).toFixed(1)}с
          </p>
          <button
            type="button"
            onClick={fetchCount}
            style={{
              marginTop: 8,
              padding: '4px 10px',
              background: 'transparent',
              border: '1px solid #dcdce4',
              borderRadius: 4,
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            Оновити лічильник
          </button>
        </div>
      ) : null}

      {error ? (
        <p style={{ ...noteStyle, color: '#d02b20' }}>{error}</p>
      ) : null}

      {count === 0 && status === 'confirming' ? (
        <p style={{ ...noteStyle, fontStyle: 'italic' }}>База вже порожня — видаляти нічого.</p>
      ) : null}
    </div>
  );
};

export default DangerZone;
