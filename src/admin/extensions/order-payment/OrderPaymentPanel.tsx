import React, { useState } from 'react';
import { useAuth } from '@strapi/strapi/admin';

type TProps = {
  readonly documentId: string;
};

type TCheckResult = {
  reconciled: boolean;
  reason?: string;
  monoStatus?: string;
  paymentStatus?: string | null;
  orderStatus?: string;
};

// inputs documentId, does reconcile payment with Mono (admin-auth) and show the real status, returns side panel content JSX
const OrderPaymentPanel: React.FC<TProps> = ({ documentId }) => {
  const token = useAuth('OrderPaymentPanel', (state) => state.token);
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const handleCheck = async () => {
    setMessage(null);
    setIsError(false);
    if (!token) {
      setIsError(true);
      setMessage('Admin session unavailable. Refresh the page and sign in again.');
      return;
    }
    setIsBusy(true);
    try {
      // Native fetch with the admin token: route is content-api (/api) but gated by the is-admin policy.
      const backendURL = (window as unknown as { strapi?: { backendURL?: string } }).strapi?.backendURL ?? '';
      const res = await fetch(`${backendURL}/api/orders/check-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ orderDocumentId: documentId }),
      });
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = (await res.json()) as TCheckResult;

      if (!data.reconciled) {
        const reasons: Record<string, string> = {
          'no-invoice': 'Інвойс не створювався — клієнт не починав оплату.',
          'not-configured': 'Платіжний токен не налаштований на сервері.',
          'mono-error': 'Mono не відповів. Спробуйте пізніше.',
          exception: 'Помилка запиту до Mono. Спробуйте пізніше.',
        };
        setMessage(reasons[data.reason ?? ''] ?? 'Не вдалося перевірити оплату.');
        return;
      }

      if (data.paymentStatus === 'paid') {
        setMessage('✅ Оплачено. Оновлюю сторінку…');
        setTimeout(() => window.location.reload(), 1200);
      } else if (data.paymentStatus === 'failed') {
        setMessage('❌ Оплата не пройшла / скасована. Оновлюю сторінку…');
        setTimeout(() => window.location.reload(), 1200);
      } else {
        setMessage(`⏳ Оплата ще не надійшла (Mono: ${data.monoStatus ?? '—'}).`);
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      setIsError(true);
      setMessage(e.message ?? 'Не вдалося перевірити оплату.');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>
        Звіряє реальний статус оплати напряму з Mono (рятує, якщо вебхук не дійшов).
      </p>
      <button
        type="button"
        onClick={handleCheck}
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
        {isBusy ? 'Перевірка…' : 'Перевірити оплату'}
      </button>
      {message ? (
        <p style={{ fontSize: '12px', color: isError ? '#d02b20' : '#328048', margin: 0 }}>{message}</p>
      ) : null}
    </div>
  );
};

export default OrderPaymentPanel;
