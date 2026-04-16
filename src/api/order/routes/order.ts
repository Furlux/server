import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::order.order', {
  config: {
    find: { middlewares: ['api::order.remap-status'] },
    findOne: { middlewares: ['api::order.remap-status'] },
    create: { middlewares: ['api::order.remap-status'] },
    update: { middlewares: ['api::order.remap-status'] },
  },
});
