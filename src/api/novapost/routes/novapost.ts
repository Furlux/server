export default {
  routes: [
    {
      method: 'GET',
      path: '/novapost/cities',
      handler: 'novapost.getCities',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/novapost/warehouses/:cityRef',
      handler: 'novapost.getWarehouses',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
};
