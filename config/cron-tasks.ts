// Strapi cron tasks. Registered via config/server.ts (cron.enabled + cron.tasks).
export default {
  // inputs strapi, does reconcile pending orders against Mono so missed webhooks self-heal, returns void
  reconcilePendingPayments: {
    task: async ({ strapi }: { strapi: any }) => {
      const since = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

      const orders = await strapi.documents('api::order.order').findMany({
        filters: {
          paymentStatus: { $eq: 'pending' },
          monoInvoiceId: { $notNull: true },
          createdAt: { $gte: since },
        },
        fields: ['documentId', 'paymentStatus', 'monoInvoiceId'],
        limit: 100,
      });

      if (!orders || orders.length === 0) return;

      const service = strapi.service('api::order.order');
      let updated = 0;
      for (const order of orders) {
        const before = order.paymentStatus;
        const result = await service.reconcileOrderPayment(order);
        if (result?.paymentStatus && result.paymentStatus !== before) updated += 1;
      }

      strapi.log.info(`[cron] reconcilePendingPayments: checked ${orders.length}, updated ${updated}`);
    },
    options: {
      rule: '*/10 * * * *', // every 10 minutes
    },
  },
};
