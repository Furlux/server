import { factories } from '@strapi/strapi';
import { notifyManagerOrderPaid } from '../lib/notify';

const MONO_API_URL = 'https://api.monobank.ua/api/merchant/invoice/create';

const MONO_PAYMENT_STATUS_MAP: Record<string, string> = {
  success: 'paid',
  failure: 'failed',
  reversed: 'failed',
  expired: 'failed',
};

export default factories.createCoreService('api::order.order', ({ strapi }) => ({
  // inputs order object, does create Mono invoice via API, returns { pageUrl, invoiceId }
  async createMonoInvoice(order) {
    const token = process.env.PLATA_BY_MONO_TOKEN;
    if (!token) {
      throw new Error('PLATA_BY_MONO_TOKEN is not configured');
    }

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const serverUrl = strapi.config.get('server.url') || process.env.SERVER_URL || 'http://localhost:1337';
    const botUsername = process.env.BOT_USERNAME;

    const strapiUrl = process.env.STRAPI_URL || serverUrl;

    const basketOrder = (order.items || []).map((item) => ({
      name: item.productName,
      qty: item.quantity,
      sum: Math.round(item.price * 100), // unit price in kopecks; Mono calculates line total as sum * qty
      unit: 'шт.',
      code: item.productSlug || item.productName,
      icon: item.imageUrl ? `${strapiUrl}${item.imageUrl}` : undefined,
    }));

    // Derive amount from basket to avoid rounding mismatch: Mono validates Σ(sum * qty) == amount
    const amount = basketOrder.reduce((acc, item) => acc + item.sum * item.qty, 0);

    const payload = {
      amount,
      ccy: 980, // UAH
      merchantPaymInfo: {
        reference: order.documentId,
        destination: `Замовлення #${order.id}`,
        basketOrder,
      },
      redirectUrl: botUsername
        ? `https://t.me/${botUsername}?startapp=order_${order.documentId}`
        : `${clientUrl}/profile/orders/${order.documentId}`,
      webhookUrl: `${serverUrl}/api/orders/mono-webhook`,
    };

    strapi.log.info(`Mono invoice for order ${order.id}: amount=${amount} webhookUrl=${payload.webhookUrl}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(MONO_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Token': token,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      strapi.log.error(`Mono API error: ${response.status} ${errorText}`);
      throw new Error(`${response.status}: ${errorText}`);
    }

    const data = await response.json() as { pageUrl: string; invoiceId: string };

    return {
      pageUrl: data.pageUrl,
      invoiceId: data.invoiceId,
    };
  },

  // inputs order, does decrement product stock + notify manager once (idempotent via stockDecrementedAt), returns void
  async applyPaidSideEffects(order) {
    if ((order as any).stockDecrementedAt) {
      return; // already applied
    }

    type TOrderItem = { productSlug?: string | null; quantity: number };
    const items = Array.isArray(order.items) ? (order.items as TOrderItem[]) : [];

    for (const item of items) {
      if (!item.productSlug) continue;

      const products = await strapi.documents('api::product.product').findMany({
        filters: { slug: { $eq: item.productSlug } },
        limit: 1,
      });

      const product = products[0];
      if (!product || product.stockQuantity == null) continue;

      const newQty = Math.max(0, (product.stockQuantity ?? 0) - item.quantity);
      await strapi.documents('api::product.product').update({
        documentId: product.documentId,
        data: { stockQuantity: newQty },
      });

      strapi.log.info(`Stock updated for "${item.productSlug}": ${product.stockQuantity} → ${newQty}`);
    }

    await notifyManagerOrderPaid(order as any);

    // Mark applied via raw db query so this does NOT re-trigger the order afterUpdate lifecycle
    await strapi.db.query('api::order.order').update({
      where: { id: (order as any).id },
      data: { stockDecrementedAt: new Date() },
    });
  },

  // inputs webhook data from Mono, does find order and set paymentStatus (side effects run in afterUpdate), returns void
  async handleMonoWebhook(webhookData) {
    const { invoiceId, status } = webhookData;

    if (!invoiceId || !status) {
      strapi.log.warn('Mono webhook: missing invoiceId or status');
      return;
    }

    const orders = await strapi.documents('api::order.order').findMany({
      filters: { monoInvoiceId: { $eq: invoiceId } },
      limit: 1,
    });

    if (!orders || orders.length === 0) {
      strapi.log.warn(`Mono webhook: order not found for invoiceId ${invoiceId}`);
      return;
    }

    const order = orders[0];

    // Idempotency: skip if already paid
    if ((order as any).paymentStatus === 'paid') {
      strapi.log.info(`Mono webhook: order ${order.documentId} already paid, skipping`);
      return;
    }

    const newPaymentStatus = MONO_PAYMENT_STATUS_MAP[status];
    if (!newPaymentStatus) {
      strapi.log.info(`Mono webhook: unmapped status "${status}" for order ${order.documentId}`);
      return;
    }

    const data: any = { paymentStatus: newPaymentStatus };
    if (newPaymentStatus === 'failed') data.orderStatus = 'cancelled';

    // Side effects (stock decrement + notifications) run in the order afterUpdate lifecycle on paymentStatus=paid
    await strapi.documents('api::order.order').update({
      documentId: order.documentId,
      data,
    });

    strapi.log.info(`Order ${order.documentId} paymentStatus → ${newPaymentStatus} via Mono webhook`);
  },

  // inputs order, does fetch real invoice status from Mono and apply it via the webhook handler, returns summary
  async reconcileOrderPayment(order) {
    const token = process.env.PLATA_BY_MONO_TOKEN;
    const invoiceId = (order as any).monoInvoiceId as string | null | undefined;

    if (!invoiceId) {
      return { reconciled: false, reason: 'no-invoice', paymentStatus: (order as any).paymentStatus };
    }
    if (!token) {
      strapi.log.error('reconcileOrderPayment: PLATA_BY_MONO_TOKEN not configured');
      return { reconciled: false, reason: 'not-configured', paymentStatus: (order as any).paymentStatus };
    }

    let monoStatus: string;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(`https://api.monobank.ua/api/merchant/invoice/status?invoiceId=${invoiceId}`, {
        headers: { 'X-Token': token },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) {
        strapi.log.warn(`reconcileOrderPayment: Mono status ${res.status} for invoice ${invoiceId}`);
        return { reconciled: false, reason: 'mono-error', paymentStatus: (order as any).paymentStatus };
      }
      const data = await res.json() as { status: string };
      monoStatus = data.status;
    } catch (e) {
      strapi.log.error(`reconcileOrderPayment: error for invoice ${invoiceId}: ${e instanceof Error ? e.message : String(e)}`);
      return { reconciled: false, reason: 'exception', paymentStatus: (order as any).paymentStatus };
    }

    // Apply via the same path as the live webhook (idempotent; handles status mapping, manager notify, stock)
    await (strapi.service('api::order.order') as any).handleMonoWebhook({ invoiceId, status: monoStatus });

    const updated = await strapi.documents('api::order.order').findOne({ documentId: order.documentId });
    return {
      reconciled: true,
      monoStatus,
      paymentStatus: (updated as any)?.paymentStatus ?? (order as any).paymentStatus,
      orderStatus: (updated as any)?.orderStatus ?? (order as any).orderStatus,
    };
  },
}));
