export default [
  'strapi::logger',
  'strapi::errors',
  'strapi::security',
  'strapi::cors',
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
