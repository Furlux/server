import crypto from 'node:crypto';
import { factories } from '@strapi/strapi';
import { notifyManagerPaymentError } from '../lib/notify';

let cachedMonoPubKey: crypto.KeyObject | null = null;

// inputs token, does fetch and cache Mono ECDSA public key, returns KeyObject
const getMonoPubKey = async (token: string): Promise<crypto.KeyObject> => {
  if (cachedMonoPubKey) return cachedMonoPubKey;
  const res = await fetch('https://api.monobank.ua/api/merchant/pubkey', {
    headers: { 'X-Token': token },
  });
  if (!res.ok) throw new Error(`Failed to fetch Mono pubkey: ${res.status}`);
  const { key } = await res.json() as { key: string };
  cachedMonoPubKey = crypto.createPublicKey({
    key: Buffer.from(key, 'base64'),
    format: 'der',
    type: 'spki',
  });
  return cachedMonoPubKey;
};

// inputs raw body + X-Sign header + token, does ECDSA P-256 verification via Mono public key, returns boolean
const verifyMonoSignature = async (rawBody: string, signature: string, token: string): Promise<boolean> => {
  try {
    const pubKey = await getMonoPubKey(token);
    return crypto.verify(
      'SHA256',
      Buffer.from(rawBody),
      { key: pubKey, dsaEncoding: 'der' },
      Buffer.from(signature, 'base64'),
    );
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

    // Idempotency: if invoice already exists, fetch its page URL from Mono instead of creating a new one
    const existingInvoiceId = (order as any).monoInvoiceId as string | null | undefined;
    if (existingInvoiceId) {
      try {
        const token = process.env.PLATA_BY_MONO_TOKEN!;
        const res = await fetch(`https://api.monobank.ua/api/merchant/invoice/status?invoiceId=${existingInvoiceId}`, {
          headers: { 'X-Token': token },
        });
        if (res.ok) {
          const data = await res.json() as { status: string; pageUrl?: string };
          if (data.pageUrl && data.status !== 'expired' && data.status !== 'failure') {
            ctx.body = { pageUrl: data.pageUrl, invoiceId: existingInvoiceId };
            return;
          }
        }
      } catch {
        // invoice lookup failed — fall through to create a new one
      }
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

  // inputs ctx with Mono webhook payload, does verify ECDSA signature then update order status, returns 200
  async monoWebhook(ctx) {
    strapi.log.info(`Mono webhook received: ${JSON.stringify(ctx.request.body)}`);

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

    const rawBody: string =
      (ctx.request as any).rawBody
      ?? (ctx.request.body as any)[Symbol.for('unparsedBody')]
      ?? JSON.stringify(ctx.request.body);

    strapi.log.info(`Mono webhook rawBody length=${rawBody.length} signature=${signature.slice(0, 10)}...`);

    const isValid = await verifyMonoSignature(rawBody, signature, token);
    if (!isValid) {
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
