import React, { useState } from 'react';
import { useAuth } from '@strapi/strapi/admin';

type TProps = {
  readonly documentId: string;
  readonly orderId?: number | string;
};

// inputs documentId + optional orderId, does fetch the order PDF (admin-auth) and trigger download, returns side panel content JSX
const OrderPrintPanel: React.FC<TProps> = ({ documentId, orderId }) => {
  const token = useAuth('OrderPrintPanel', (state) => state.token);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePrint = async () => {
    setError(null);
    if (!token) {
      setError('Сесія адміністратора недоступна. Оновіть сторінку та увійдіть знову.');
      return;
    }
    setIsBusy(true);
    try {
      // Native fetch (not getFetchClient, which force-parses JSON) with the admin token.
      // The route is content-api (/api) but gated by the is-admin policy, which validates this token.
      const backendURL = (window as unknown as { strapi?: { backendURL?: string } }).strapi?.backendURL ?? '';
      const res = await fetch(`${backendURL}/api/orders/${documentId}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error(`Сервер повернув ${res.status}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      try {
        const link = document.createElement('a');
        link.href = url;
        link.download = `order-${orderId ?? documentId}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
      } finally {
        URL.revokeObjectURL(url);
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message ?? 'Не вдалося згенерувати PDF');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>
        PDF замовлення: товари, сума, клієнт - той самий вміст, що йде в Telegram, плюс місто й адреса доставки.
      </p>
      <button
        type="button"
        onClick={handlePrint}
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
        {isBusy ? 'Формування...' : 'Друкувати PDF'}
      </button>
      {error ? <p style={{ fontSize: '12px', color: '#d02b20', margin: 0 }}>{error}</p> : null}
    </div>
  );
};

export default OrderPrintPanel;
