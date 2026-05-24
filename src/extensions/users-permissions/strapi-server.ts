// inputs Strapi users-permissions plugin object, does hide User collection from Content Manager sidebar globally (incl. Super Admin), returns mutated plugin
export default (plugin: { contentTypes: { user: { pluginOptions?: Record<string, unknown> } } }) => {
  const userCT = plugin.contentTypes.user;
  userCT.pluginOptions = {
    ...(userCT.pluginOptions ?? {}),
    'content-manager': {
      ...((userCT.pluginOptions?.['content-manager'] as Record<string, unknown>) ?? {}),
      visible: false,
    },
  };
  return plugin;
};
