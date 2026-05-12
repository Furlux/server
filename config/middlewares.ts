export default [
  'strapi::logger',
  'strapi::errors',
  'strapi::security',
  {
    name: 'strapi::cors',
    config: {
      // Keep client custom headers allow-listed. Without 'x-telegram-init-data'
      // the browser's OPTIONS preflight strips Access-Control-Allow-Headers and
      // the actual fetch aborts with the generic "Load failed" WebKit error.
      headers: [
        'Content-Type',
        'Authorization',
        'Origin',
        'Accept',
        'x-telegram-init-data',
      ],
      // Cap browser preflight cache at 10 minutes so future header changes
      // propagate quickly instead of being stuck behind a year-long cache
      // (default Strapi Cloud response was Access-Control-Max-Age: 31536000).
      maxAge: 600,
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
