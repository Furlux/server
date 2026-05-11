export default [
  'strapi::logger',
  'strapi::errors',
  'strapi::security',
  {
    name: 'strapi::cors',
    config: {
      headers: [
        'Content-Type',
        'Authorization',
        'Origin',
        'Accept',
        'x-telegram-init-data',
      ],
    },
  },
  'strapi::poweredBy',
  'strapi::query',
  {
    name: 'strapi::body',
    config: {
      jsonLimit: '20mb',
      formLimit: '20mb',
      textLimit: '20mb',
    },
  },
  'strapi::session',
  'strapi::favicon',
  {
    name: 'global::telegram-auth',
    config: {
      enabled: false,
      publicRoutes: ['/api/products', '/api/page', '/api/filters'],
    },
  },
  'strapi::public',
];
