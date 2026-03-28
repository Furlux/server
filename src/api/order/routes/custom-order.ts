export default {
  routes: [
    {
      method: 'POST',
      path: '/orders/create-payment',
      handler: 'order.createPayment',
      config: {
        auth: false,
      },
    },
    {
      method: 'POST',
      path: '/orders/mono-webhook',
      handler: 'order.monoWebhook',
      config: {
        auth: false,
      },
    },
  ],
};
