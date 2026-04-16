export default {
  routes: [
    {
      method: 'POST',
      path: '/upload-from-drive',
      handler: 'upload-from-drive.upload',
      config: {
        policies: [],
        middlewares: [],
        auth: false,
      },
    },
  ],
};
