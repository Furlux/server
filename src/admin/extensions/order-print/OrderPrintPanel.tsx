import React, { useState } from 'react';
import { useAuth } from '@strapi/strapi/admin';

type TProps = {
  readonly documentId: string;
  readonly orderId?: number | string;
};

type TFormat = 'pdf' | 'excel';

const EXT: Record<TFormat, string> = { pdf: 'pdf', excel: 'xlsx' };

// inputs documentId + optional orderId, does fetch the order as PDF/Excel (admin-auth) and trigger download, returns side panel content JSX
const OrderPrintPanel: React.FC<TProps> = ({ documentId, orderId }) => {
  const token = useAuth('OrderPrintPanel', (state) => state.token);
  const [busy, setBusy] = useState<TFormat | null>(null);
  const [error, setError] = useState<string | null>(null);

  const download = async (format: TFormat) => {
    setError(null);
    if (!token) {
      setError('Admin session unavailable. Refresh the page and sign in again.');
      return;
    }
    setBusy(format);
    try {
      // Native fetch (not getFetchClient, which force-parses JSON) with the admin token.
      // The route is content-api (/api) but gated by the is-admin policy, which validates this token.
      const backendURL = (window as unknown as { strapi?: { backendURL?: string } }).strapi?.backendURL ?? '';
      const res = await fetch(`${backendURL}/api/orders/${documentId}/${format}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      try {
        const link = document.createElement('a');
        link.href = url;
        link.download = `order-${orderId ?? documentId}.${EXT[format]}`;
        document.body.appendChild(link);
        link.click();
        link.remove();
      } finally {
        URL.revokeObjectURL(url);
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message ?? 'Failed to generate file');
    } finally {
      setBusy(null);
    }
  };

  const button = (format: TFormat, label: string): React.ReactNode => (
    <button
      type="button"
      onClick={() => download(format)}
      disabled={busy !== null}
      style={{
        padding: '8px 12px',
        background: busy !== null ? '#dcdce4' : '#4945ff',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: busy !== null ? 'not-allowed' : 'pointer',
        fontSize: '12px',
        fontWeight: 600,
      }}
    >
      {busy === format ? 'Generating…' : label}
    </button>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>
        Order export: items, colours, total, client and delivery.
      </p>
      {button('pdf', 'Print PDF')}
      {button('excel', 'Export Excel')}
      {error ? <p style={{ fontSize: '12px', color: '#d02b20', margin: 0 }}>{error}</p> : null}
    </div>
  );
};

export default OrderPrintPanel;
