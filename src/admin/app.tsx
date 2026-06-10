import type { StrapiApp } from '@strapi/strapi/admin';
import DrivePanel from './extensions/drive-import/DrivePanel';
import OrderPrintPanel from './extensions/order-print/OrderPrintPanel';
import { guardPasswordFields } from './extensions/guard-password-fields';

const UploadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

export default {
  config: {
    locales: [],
  },
  bootstrap(app: StrapiApp) {
    guardPasswordFields();

    app
      .getPlugin('content-manager')
      .apis.addEditViewSidePanel((panels) => {
        return [
          ...panels,
          (context: { model: string; documentId?: string }) => {
            if (context.model !== 'api::product.product') return null;
            return {
              title: 'Google Drive',
              content: (
                <DrivePanel
                  documentId={context.documentId ?? ''}
                  onDone={() => window.location.reload()}
                />
              ),
            };
          },
          (context: { model: string; documentId?: string; document?: { id?: number } }) => {
            if (context.model !== 'api::order.order') return null;
            if (!context.documentId) return null;
            return {
              title: 'Print',
              content: (
                <OrderPrintPanel
                  documentId={context.documentId}
                  orderId={context.document?.id}
                />
              ),
            };
          },
        ];
      });

    app.addMenuLink({
      to: '/csv-migration',
      icon: UploadIcon,
      intlLabel: { id: 'csv-migration.menu', defaultMessage: 'CSV Migration' },
      Component: async () => {
        const mod = await import('./extensions/csv-migration/CsvMigrationPage');
        return mod.default;
      },
      permissions: [],
    });
  },
};
