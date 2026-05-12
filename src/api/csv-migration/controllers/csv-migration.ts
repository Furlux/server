import type { Core } from '@strapi/strapi';
import { deleteJob, type TMigrationOptions } from '../lib/job-state';

// inputs request body, does validate options shape, returns normalized options
const parseOptions = (raw: unknown): TMigrationOptions => {
  const obj = (raw && typeof raw === 'object') ? (raw as Record<string, unknown>) : {};
  const modeRaw = obj.mode;
  const mode = modeRaw === 'update' ? 'update' : 'skip';
  return {
    mode,
    dryRun: obj.dryRun === true,
  };
};

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async start(ctx) {
    const body = (ctx.request.body ?? {}) as Record<string, unknown>;
    const csvBase64 = body.csvBase64;
    if (!csvBase64 || typeof csvBase64 !== 'string') {
      return ctx.badRequest('Поле "csvBase64" є обовʼязковим');
    }
    const options = parseOptions(body.options);
    try {
      const service = strapi.service('api::csv-migration.csv-migration');
      const result = await service.startMigration({ csvBase64, options });
      ctx.body = { success: true, ...result };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Невідома помилка';
      strapi.log.error(`[csv-migration] start failed: ${message}`);
      return ctx.badRequest(message);
    }
  },

  async status(ctx) {
    const { jobId } = ctx.params;
    if (!jobId || typeof jobId !== 'string') {
      return ctx.badRequest('jobId обовʼязковий');
    }
    const service = strapi.service('api::csv-migration.csv-migration');
    const job = service.getJobState(jobId);
    if (!job) {
      return ctx.notFound(`Job ${jobId} не знайдено`);
    }
    ctx.body = job;
  },

  async deleteJob(ctx) {
    const { jobId } = ctx.params;
    if (!jobId || typeof jobId !== 'string') {
      return ctx.badRequest('jobId обовʼязковий');
    }
    const removed = deleteJob(jobId);
    ctx.body = { success: removed };
  },

  async productCount(ctx) {
    const service = strapi.service('api::csv-migration.csv-migration');
    const count = await service.countProducts();
    ctx.body = { count };
  },

  async purgeProducts(ctx) {
    const body = (ctx.request.body ?? {}) as Record<string, unknown>;
    if (body.confirm !== 'DELETE-ALL-PRODUCTS') {
      return ctx.badRequest('Підтвердження невірне. Потрібно передати { confirm: "DELETE-ALL-PRODUCTS" }');
    }
    try {
      const service = strapi.service('api::csv-migration.csv-migration');
      const result = await service.purgeAllProducts();
      strapi.log.warn(`[csv-migration] PURGED ${result.deleted} products in ${(result.durationMs / 1000).toFixed(1)}s`);
      ctx.body = { success: true, ...result };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Невідома помилка';
      strapi.log.error(`[csv-migration] purge failed: ${message}`);
      return ctx.badRequest(message);
    }
  },
});
