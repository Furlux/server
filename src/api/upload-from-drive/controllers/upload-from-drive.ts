import type { Core } from '@strapi/strapi';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async upload(ctx) {
    const { url, productDocumentId } = ctx.request.body ?? {};

    if (!url || typeof url !== 'string') {
      return ctx.badRequest('Поле "url" є обов\'язковим');
    }
    if (!productDocumentId || typeof productDocumentId !== 'string') {
      return ctx.badRequest('Поле "productDocumentId" є обов\'язковим');
    }

    try {
      const service = strapi.service('api::upload-from-drive.upload-from-drive');
      const result = await service.uploadAndAttach({ url, productDocumentId });
      ctx.body = { success: true, ...result };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Невідома помилка';
      strapi.log.error(`[upload-from-drive] ${message}`);
      return ctx.badRequest(message);
    }
  },
});
