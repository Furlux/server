import type { Core } from '@strapi/strapi';
import { gunzipSync } from 'zlib';
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

// inputs buffer, does check first two bytes for gzip magic 0x1f 0x8b, returns boolean
const isGzipBuffer = (buf: Buffer): boolean =>
  buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b;

// inputs base64 string, does decode + optionally gunzip if magic bytes match, returns UTF-8 text
const decodePayload = (csvBase64: string): string => {
  const buf = Buffer.from(csvBase64, 'base64');
  if (isGzipBuffer(buf)) {
    return gunzipSync(buf).toString('utf-8');
  }
  return buf.toString('utf-8');
};

const RATE_LIMIT_MS = 0;
const PROGRESS_LOG_TAG = '[csv-migration]';

// inputs nothing, does sleep for given ms, returns Promise
const sleep = (ms: number): Promise<void> => new Promise((res) => setTimeout(res, ms));

// inputs bucket, does format average ms per call, returns string
const fmtAvg = (b: { count: number; totalMs: number }): string =>
  b.count === 0 ? 'n/a' : `${(b.totalMs / b.count).toFixed(0)}мс`;

// inputs total ms, does format as Xs or Xмхв Yс, returns string
const fmtTotal = (totalMs: number): string => {
  const s = totalMs / 1000;
  if (s < 60) return `${s.toFixed(1)}с`;
  return `${Math.floor(s / 60)}хв ${Math.round(s % 60)}с`;
};

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

// inputs strapi + article + computed slug, does find existing product by articleNumber then by slug, returns product or null
const findExistingProduct = async (
  strapi: Core.Strapi,
  article: string,
  slug: string,
): Promise<{ documentId: string } | null> => {
  const byArticle = (await strapi.documents('api::product.product').findFirst({
    filters: { articleNumber: { $eq: article } },
    fields: ['articleNumber', 'slug'],
  })) as { documentId: string } | null;
  if (byArticle) return byArticle;

  const bySlug = (await strapi.documents('api::product.product').findFirst({
    filters: { slug: { $eq: slug } },
    fields: ['articleNumber', 'slug'],
  })) as { documentId: string } | null;
  return bySlug;
};

// inputs raw error, does pick a photo-pipeline stage based on message, returns stage label
const detectPhotoStage = (raw: string): 'download' | 'convert' | 'upload' | 'attach' | 'unknown' => {
  if (/Drive download failed|drive\.usercontent|Not an image|extract.+id/i.test(raw)) return 'download';
  if (/heic|convert/i.test(raw)) return 'convert';
  if (/presigned URL|Gateway Time-out|ENOENT|writeFile|upload/i.test(raw)) return 'upload';
  if (/Товар не знайдено|attach|images/i.test(raw)) return 'attach';
  return 'unknown';
};

// inputs strapi + jobId + row[0] + productDocId, does call upload-from-drive service with timing, returns void
const uploadPhotoForProduct = async (
  strapi: Core.Strapi,
  job: TJobState,
  row: TCsvRow,
  article: string,
  productDocumentId: string,
): Promise<void> => {
  const driveUrl = (row['Для Михаила'] || '').trim();
  if (!driveUrl) return;
  const t0 = performance.now();
  try {
    const uploadService = strapi.service('api::upload-from-drive.upload-from-drive');
    await uploadService.uploadAndAttach({ url: driveUrl, productDocumentId });
    job.timings.photo.count += 1;
    job.timings.photo.totalMs += performance.now() - t0;
  } catch (e: unknown) {
    job.timings.photo.count += 1;
    job.timings.photo.totalMs += performance.now() - t0;
    const err = e as Error;
    const message = err?.message ?? String(e);
    job.photoFailed.push({
      article,
      url: driveUrl,
      error: message,
      context: {
        errorName: err?.name,
        stack: err?.stack?.split('\n').slice(0, 6).join('\n'),
        stage: detectPhotoStage(message),
      },
    });
    pushLog(job, `  PHOTO FAIL ${article} [stage=${detectPhotoStage(message)}]: ${err?.name ?? 'Error'}: ${message}`);
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

      let attemptedOperation: 'CREATE' | 'UPDATE' | 'LOOKUP' = 'LOOKUP';
      let payloadSnapshot: { slug?: string; title?: string } = {};

      try {
        const payload = buildProductPayload(articleRows, categories);
        payloadSnapshot = { slug: payload.slug, title: payload.title };
        const tLookup = performance.now();
        const existing = await findExistingProduct(strapi, article, payload.slug);
        job.timings.lookup.count += 1;
        job.timings.lookup.totalMs += performance.now() - tLookup;

        if (existing && options.mode === 'skip') {
          job.skipped += 1;
          pushLog(job, `${prefix}: SKIP (existing)`);
          job.processed = i;
          continue;
        }

        if (options.dryRun) {
          pushLog(job, `${prefix}: DRY-RUN ${payload.title}`);
          job.processed = i;
          continue;
        }

        if (existing && options.mode === 'update') {
          attemptedOperation = 'UPDATE';
          const tUpdate = performance.now();
          await strapi.documents('api::product.product').update({
            documentId: existing.documentId,
            data: payload as never,
          });
          job.timings.update.count += 1;
          job.timings.update.totalMs += performance.now() - tUpdate;
          job.updated += 1;
          pushLog(job, `${prefix}: UPDATED (photos untouched)`);
        } else {
          attemptedOperation = 'CREATE';
          const tCreate = performance.now();
          const created = (await strapi.documents('api::product.product').create({
            data: payload as never,
          })) as { documentId: string };
          job.timings.create.count += 1;
          job.timings.create.totalMs += performance.now() - tCreate;
          job.created += 1;
          pushLog(job, `${prefix}: CREATED`);
          await uploadPhotoForProduct(strapi, job, firstRow, article, created.documentId);
        }
      } catch (e: unknown) {
        const err = e as Error & { details?: unknown };
        const message = err?.message ?? String(e);
        job.failed.push({
          article,
          error: message,
          context: {
            operation: attemptedOperation,
            slug: payloadSnapshot.slug,
            title: payloadSnapshot.title,
            errorName: err?.name,
            errorDetails: err?.details,
            stack: err?.stack?.split('\n').slice(0, 6).join('\n'),
          },
        });
        pushLog(job, `${prefix}: FAIL [${attemptedOperation}] ${err?.name ?? 'Error'}: ${message}`);
      }

      job.processed = i;
      if (RATE_LIMIT_MS > 0) {
        await sleep(RATE_LIMIT_MS);
      }
    }

    job.status = 'completed';
    job.finishedAt = Date.now();
    const wallClockMs = job.finishedAt - job.startedAt;
    pushLog(job, `=== DONE === created=${job.created} updated=${job.updated} skipped=${job.skipped} failed=${job.failed.length} photoFailed=${job.photoFailed.length}`);
    pushLog(job, `=== TIMINGS ===`);
    pushLog(job, `Wall clock: ${fmtTotal(wallClockMs)}`);
    pushLog(job, `Lookup: avg ${fmtAvg(job.timings.lookup)} × ${job.timings.lookup.count} = ${fmtTotal(job.timings.lookup.totalMs)}`);
    pushLog(job, `Create: avg ${fmtAvg(job.timings.create)} × ${job.timings.create.count} = ${fmtTotal(job.timings.create.totalMs)}`);
    pushLog(job, `Update: avg ${fmtAvg(job.timings.update)} × ${job.timings.update.count} = ${fmtTotal(job.timings.update.totalMs)}`);
    pushLog(job, `Photo:  avg ${fmtAvg(job.timings.photo)} × ${job.timings.photo.count} = ${fmtTotal(job.timings.photo.totalMs)}`);
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
    const csvText = decodePayload(csvBase64);
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
