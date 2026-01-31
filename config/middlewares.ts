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
      enabled: true,
      publicRoutes: ['/api/products', '/api/pages', '/api/filters'],
    },
  },
  'strapi::public',
];
