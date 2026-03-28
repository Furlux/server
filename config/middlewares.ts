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
  'strapi::body',
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
