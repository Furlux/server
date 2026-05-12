export default {
  routes: [
    {
      method: 'POST',
      path: '/csv-migration/start',
      handler: 'csv-migration.start',
      config: {
        policies: [],
        middlewares: [],
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/csv-migration/status/:jobId',
      handler: 'csv-migration.status',
      config: {
        policies: [],
        middlewares: [],
        auth: false,
      },
    },
    {
      method: 'DELETE',
      path: '/csv-migration/jobs/:jobId',
      handler: 'csv-migration.deleteJob',
      config: {
        policies: [],
        middlewares: [],
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/csv-migration/product-count',
      handler: 'csv-migration.productCount',
      config: {
        policies: [],
        middlewares: [],
        auth: false,
      },
    },
    {
      method: 'POST',
      path: '/csv-migration/purge-products',
      handler: 'csv-migration.purgeProducts',
      config: {
        policies: [],
        middlewares: [],
        auth: false,
      },
    },
  ],
};
