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
    {
      // auth:false skips users-permissions; is-admin policy then requires a valid admin session token
      method: 'POST',
      path: '/orders/check-payment',
      handler: 'order.checkPayment',
      config: {
        auth: false,
        policies: ['global::is-admin'],
      },
    },
    {
      // auth:false skips users-permissions; is-admin policy then requires a valid admin session token
      method: 'GET',
      path: '/orders/:id/pdf',
      handler: 'order.printPdf',
      config: {
        auth: false,
        policies: ['global::is-admin'],
      },
    },
  ],
};
