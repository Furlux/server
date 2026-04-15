import type { StrapiApp } from '@strapi/strapi/admin';
import DrivePanel from './extensions/drive-import/DrivePanel';

export default {
  config: {
    locales: [],
  },
  bootstrap(app: StrapiApp) {
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
        ];
      });
  },
};
