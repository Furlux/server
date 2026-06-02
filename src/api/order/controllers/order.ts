import crypto from 'node:crypto';
import { factories } from '@strapi/strapi';
import { notifyManagerPaymentError } from '../lib/notify';

// inputs raw body + X-Sign header + token, does HMAC-SHA256 verification, returns boolean
const verifyMonoSignature = (rawBody: string, signature: string, token: string): boolean => {
  const hmac = crypto.createHmac('sha256', token);
  hmac.update(rawBody);
  const computed = hmac.digest('base64');
  try {
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
  } catch {
    return false;
  }
};

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

    if ((order as any).orderStatus !== 'pending') {
      return ctx.badRequest(`Order status is "${(order as any).orderStatus}", expected "pending"`);
    }

    try {
      const { pageUrl, invoiceId } = await (strapi.service('api::order.order') as any).createMonoInvoice(order);

      await strapi.documents('api::order.order').update({
        documentId: orderDocumentId,
        data: { monoInvoiceId: invoiceId },
      });

      ctx.body = { pageUrl, invoiceId };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      strapi.log.error('createPayment error:', error);
      await notifyManagerPaymentError(order as any, errMsg).catch(() => {});
      return ctx.internalServerError('Failed to create payment');
    }
  },

  // inputs ctx with Mono webhook payload, does verify signature then update order status, returns 200
  async monoWebhook(ctx) {
    const token = process.env.PLATA_BY_MONO_TOKEN;
    if (!token) {
      strapi.log.error('Mono webhook: PLATA_BY_MONO_TOKEN not configured');
      return ctx.unauthorized('Payment not configured');
    }

    const signature = ctx.request.headers['x-sign'] as string | undefined;
    if (!signature) {
      strapi.log.warn('Mono webhook: missing X-Sign header');
      return ctx.unauthorized('Missing signature');
    }

    const rawBody = (ctx.request as any).rawBody ?? JSON.stringify(ctx.request.body);
    if (!verifyMonoSignature(rawBody, signature, token)) {
      strapi.log.warn('Mono webhook: invalid signature');
      return ctx.unauthorized('Invalid signature');
    }

    try {
      await (strapi.service('api::order.order') as any).handleMonoWebhook(ctx.request.body);
      ctx.body = { ok: true };
    } catch (error) {
      strapi.log.error('monoWebhook error:', error);
      ctx.body = { ok: true };
    }
  },
}));
