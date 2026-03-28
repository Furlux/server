import type { Core } from '@strapi/strapi';

// inputs {strapi: Core.Strapi}, does define getCities and getWarehouses handlers, returns controller object
export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async getCities(ctx) {
    const { search, page = '1', limit = '20' } = ctx.query;

    const methodProperties: Record<string, unknown> = {
      Page: page,
      Limit: limit,
      Language: 'ua',
    };

    if (search) {
      methodProperties.FindByString = search;
    }

    try {
      const novaPostService = strapi.service('api::novapost.novapost');
      const data = await novaPostService.callNovaPostApi({
        modelName: 'Address',
        calledMethod: 'getCities',
        methodProperties,
      });

      if (!data.success) {
        return ctx.badRequest('Помилка при отриманні міст', { errors: data.errors });
      }

      ctx.body = { success: true, data: data.data };
    } catch (error) {
      ctx.internalServerError('Помилка при отриманні даних з Нової Пошти');
    }
  },

  async getWarehouses(ctx) {
    const { cityRef } = ctx.params;
    const { search, page = '1', limit = '50' } = ctx.query;

    const methodProperties: Record<string, unknown> = {
      CityRef: cityRef,
      Language: 'ua',
      Page: page,
      Limit: limit,
    };

    if (search) {
      methodProperties.FindByString = search;
    }

    try {
      const novaPostService = strapi.service('api::novapost.novapost');
      const data = await novaPostService.callNovaPostApi({
        modelName: 'Address',
        calledMethod: 'getWarehouses',
        methodProperties,
      });

      if (!data.success) {
        return ctx.badRequest('Помилка при отриманні відділень', { errors: data.errors });
      }

      ctx.body = { success: true, data: data.data };
    } catch (error) {
      ctx.internalServerError('Помилка при отриманні даних з Нової Пошти');
    }
  },
});
