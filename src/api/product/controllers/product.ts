import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::product.product', ({ strapi }) => ({
  // inputs ctx, does fetch filter metadata via service, returns JSON response
  async getFilterMetadata(ctx) {
    try {
      const data = await strapi.service('api::product.product').getFilterMetadata();
      ctx.body = { data };
    } catch (error) {
      strapi.log.error('getFilterMetadata error:', error);
      ctx.internalServerError('Failed to fetch filter metadata');
    }
  },
}));
