import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::order.order', ({ strapi }) => ({
  // inputs ctx with orderDocumentId in body, does create Mono invoice and update order, returns { pageUrl, invoiceId }
  async createPayment(ctx) {
    const { orderDocumentId } = ctx.request.body as { orderDocumentId?: string };

    if (!orderDocumentId) {
      return ctx.badRequest('orderDocumentId is required');
    }

    const order = await strapi.documents('api::order.order').findOne({
      documentId: orderDocumentId,
    });

    if (!order) {
      return ctx.notFound('Order not found');
    }

    if (order.status !== 'pending') {
      return ctx.badRequest(`Order status is "${order.status}", expected "pending"`);
    }

    try {
      const { pageUrl, invoiceId } = await (strapi.service('api::order.order') as any).createMonoInvoice(order);

      await strapi.documents('api::order.order').update({
        documentId: orderDocumentId,
        data: { monoInvoiceId: invoiceId },
      });

      ctx.body = { pageUrl, invoiceId };
    } catch (error) {
      strapi.log.error('createPayment error:', error);
      return ctx.internalServerError('Failed to create payment');
    }
  },

  // inputs ctx with Mono webhook payload, does update order status, returns 200
  async monoWebhook(ctx) {
    try {
      await (strapi.service('api::order.order') as any).handleMonoWebhook(ctx.request.body);
      ctx.body = { ok: true };
    } catch (error) {
      strapi.log.error('monoWebhook error:', error);
      ctx.body = { ok: true };
    }
  },
}));
