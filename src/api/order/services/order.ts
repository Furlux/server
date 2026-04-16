import { factories } from '@strapi/strapi';

const MONO_API_URL = 'https://api.monobank.ua/api/merchant/invoice/create';

const MONO_STATUS_MAP: Record<string, string> = {
  success: 'processing',
  failure: 'cancelled',
  reversed: 'cancelled',
  expired: 'cancelled',
};

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

    const amount = Math.round(order.totalPrice * 100);

    const strapiUrl = process.env.STRAPI_URL || serverUrl;

    const basketOrder = (order.items || []).map((item) => ({
      name: item.productName,
      qty: item.quantity,
      sum: Math.round(item.price * item.quantity * 100),
      unit: 'шт.',
      icon: item.imageUrl ? `${strapiUrl}${item.imageUrl}` : undefined,
    }));

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

    const response = await fetch(MONO_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Token': token,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      strapi.log.error(`Mono API error: ${response.status} ${errorText}`);
      throw new Error(`Mono API error: ${response.status}`);
    }

    const data = await response.json() as { pageUrl: string; invoiceId: string };

    return {
      pageUrl: data.pageUrl,
      invoiceId: data.invoiceId,
    };
  },

  // inputs webhook data from Mono, does find order and update status, returns void
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
    const newStatus = MONO_STATUS_MAP[status];
    const newPaymentStatus = MONO_PAYMENT_STATUS_MAP[status];

    if (!newStatus) {
      strapi.log.info(`Mono webhook: unmapped status "${status}" for order ${order.documentId}`);
      return;
    }

    await strapi.documents('api::order.order').update({
      documentId: order.documentId,
      data: {
        orderStatus: newStatus as 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled',
        paymentStatus: (newPaymentStatus ?? 'pending') as 'pending' | 'paid' | 'failed',
      },
    });

    strapi.log.info(`Order ${order.documentId} status updated to "${newStatus}" via Mono webhook`);

    type TOrderItem = { productSlug?: string | null; quantity: number };
    const items = Array.isArray(order.items) ? (order.items as TOrderItem[]) : [];

    if (status === 'success' && items.length > 0) {
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
    }
  },
}));
