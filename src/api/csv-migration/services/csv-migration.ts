import type { Core } from '@strapi/strapi';
import {
  buildProductPayload,
  groupByArticle,
  type TCategoriesMap,
  type TCsvRow,
} from '../lib/migration-helpers';
import { parseAndValidate } from '../lib/csv-parser';
import {
  createJob,
  getJob,
  pushLog,
  type TJobState,
  type TMigrationOptions,
} from '../lib/job-state';

const RATE_LIMIT_MS = 150;
const PROGRESS_LOG_TAG = '[csv-migration]';

// inputs nothing, does sleep for given ms, returns Promise
const sleep = (ms: number): Promise<void> => new Promise((res) => setTimeout(res, ms));

// inputs strapi instance, does fetch all categories and map slug → documentId, returns map
const resolveCategoriesBySlug = async (strapi: Core.Strapi): Promise<TCategoriesMap> => {
  const all = (await strapi.documents('api::category.category').findMany({
    fields: ['slug'],
    pagination: { limit: 200 },
  })) as Array<{ documentId: string; slug: string }>;

  const map = new Map<string, string>();
  for (const c of all) {
    if (c?.slug && c?.documentId) {
      map.set(c.slug, c.documentId);
    }
  }
  return map;
};

// inputs strapi + article, does find existing product by articleNumber, returns product or null
const findByArticleNumber = async (
  strapi: Core.Strapi,
  article: string,
): Promise<{ documentId: string } | null> => {
  const found = (await strapi.documents('api::product.product').findFirst({
    filters: { articleNumber: { $eq: article } },
    fields: ['articleNumber'],
  })) as { documentId: string } | null;
  return found;
};

// inputs strapi + jobId + row[0] + productDocId, does call upload-from-drive service, returns void
const uploadPhotoForProduct = async (
  strapi: Core.Strapi,
  job: TJobState,
  row: TCsvRow,
  article: string,
  productDocumentId: string,
): Promise<void> => {
  const driveUrl = (row['Для Михаила'] || '').trim();
  if (!driveUrl) return;
  try {
    const uploadService = strapi.service('api::upload-from-drive.upload-from-drive');
    await uploadService.uploadAndAttach({ url: driveUrl, productDocumentId });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    job.photoFailed.push({ article, url: driveUrl, error: message });
    pushLog(job, `  PHOTO FAIL ${article}: ${message}`);
  }
};

// inputs strapi + jobId + csvText + options, does run full migration in background, returns Promise<void>
const runMigration = async (
  strapi: Core.Strapi,
  jobId: string,
  csvText: string,
  options: TMigrationOptions,
): Promise<void> => {
  const job = getJob(jobId);
  if (!job) {
    strapi.log.error(`${PROGRESS_LOG_TAG} job ${jobId} disappeared before start`);
    return;
  }

  try {
    const { rows } = parseAndValidate(csvText);
    const groups = groupByArticle(rows);
    job.total = groups.size;
    job.status = 'running';
    pushLog(job, `Знайдено ${groups.size} артикулів у CSV`);

    const categories = await resolveCategoriesBySlug(strapi);
    pushLog(job, `Завантажено ${categories.size} категорій з БД`);

    let i = 0;
    for (const [, articleRows] of groups) {
      i += 1;
      const firstRow = articleRows[0];
      const article = (firstRow['Артикул'] || '').trim();
      const prefix = `[${i}/${job.total}] ${article}`;

      try {
        const existing = await findByArticleNumber(strapi, article);

        if (existing && options.mode === 'skip') {
          job.skipped += 1;
          pushLog(job, `${prefix}: SKIP (existing)`);
          job.processed = i;
          continue;
        }

        const payload = buildProductPayload(articleRows, categories);

        if (options.dryRun) {
          pushLog(job, `${prefix}: DRY-RUN ${payload.title}`);
          job.processed = i;
          continue;
        }

        if (existing && options.mode === 'update') {
          await strapi.documents('api::product.product').update({
            documentId: existing.documentId,
            data: payload as never,
          });
          job.updated += 1;
          pushLog(job, `${prefix}: UPDATED (photos untouched)`);
        } else {
          const created = (await strapi.documents('api::product.product').create({
            data: payload as never,
          })) as { documentId: string };
          job.created += 1;
          pushLog(job, `${prefix}: CREATED`);
          await uploadPhotoForProduct(strapi, job, firstRow, article, created.documentId);
        }
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        job.failed.push({ article, error: message });
        pushLog(job, `${prefix}: FAIL ${message}`);
      }

      job.processed = i;
      if (RATE_LIMIT_MS > 0) {
        await sleep(RATE_LIMIT_MS);
      }
    }

    job.status = 'completed';
    job.finishedAt = Date.now();
    pushLog(job, `=== DONE === created=${job.created} updated=${job.updated} skipped=${job.skipped} failed=${job.failed.length} photoFailed=${job.photoFailed.length}`);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    job.status = 'failed';
    job.fatalError = message;
    job.finishedAt = Date.now();
    pushLog(job, `FATAL: ${message}`);
    strapi.log.error(`${PROGRESS_LOG_TAG} fatal error in job ${jobId}: ${message}`);
  }
};

// inputs strapi instance, does export public API with start/get, returns service object
export default ({ strapi }: { strapi: Core.Strapi }) => ({
  // inputs csvBase64 + options, does pre-validate, create job, fire migration, returns { jobId, total }
  async startMigration({
    csvBase64,
    options,
  }: {
    csvBase64: string;
    options: TMigrationOptions;
  }): Promise<{ jobId: string; total: number }> {
    const csvText = Buffer.from(csvBase64, 'base64').toString('utf-8');
    const { rows } = parseAndValidate(csvText);
    const groups = groupByArticle(rows);

    const jobId = `csv-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const job = createJob(jobId, options);
    job.total = groups.size;

    void runMigration(strapi, jobId, csvText, options);

    return { jobId, total: groups.size };
  },

  getJobState(jobId: string): TJobState | undefined {
    return getJob(jobId);
  },
});
