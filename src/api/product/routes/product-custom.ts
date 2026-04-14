export default {
  routes: [
    {
      method: 'GET',
      path: '/products/filter-metadata',
      handler: 'product.getFilterMetadata',
      config: { auth: false },
    },
  ],
};
