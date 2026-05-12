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
import { generateSummary, isAiEnabled } from '../lib/ai-summarizer';

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

type TExistingProduct = {
  documentId: string;
  [key: string]: unknown;
};

const COMPARE_FIELDS = [
  'title', 'slug', 'articleNumber', 'supplierCode', 'price', 'currency',
  'stockQuantity', 'available', 'isNew', 'isBrand', 'hasClipon',
  'productStatus', 'photoFormat', 'gender', 'frameType', 'frameShape', 'lensType',
] as const;

// inputs strapi + article + computed slug + withFullData flag, does find existing product, returns product or null
const findExistingProduct = async (
  strapi: Core.Strapi,
  article: string,
  slug: string,
  withFullData: boolean,
): Promise<TExistingProduct | null> => {
  const fields = (withFullData ? [...COMPARE_FIELDS] : ['articleNumber', 'slug']) as never;
  const populate = (withFullData ? { category: { fields: ['documentId'] }, variants: true } : undefined) as never;

  const byArticle = (await strapi.documents('api::product.product').findFirst({
    filters: { articleNumber: { $eq: article } },
    fields,
    populate,
  })) as TExistingProduct | null;
  if (byArticle) return byArticle;

  const bySlug = (await strapi.documents('api::product.product').findFirst({
    filters: { slug: { $eq: slug } },
    fields,
    populate,
  })) as TExistingProduct | null;
  return bySlug;
};

// inputs existing variants array + payload variants, does compare ignoring DB ids and order, returns boolean
const variantsMatch = (
  existing: unknown,
  payload: ReadonlyArray<{ code: string; label: string; stockQuantity?: number }> | undefined,
): boolean => {
  const a = Array.isArray(existing)
    ? existing.map((v: { code?: string; label?: string; stockQuantity?: number | null }) => ({
        code: v.code ?? '',
        label: v.label ?? '',
        stockQuantity: v.stockQuantity ?? 0,
      }))
    : [];
  const b = (payload ?? []).map((v) => ({
    code: v.code,
    label: v.label,
    stockQuantity: v.stockQuantity ?? 0,
  }));
  if (a.length !== b.length) return false;
  const sortFn = (x: { code: string }, y: { code: string }) => x.code.localeCompare(y.code);
  a.sort(sortFn);
  b.sort(sortFn);
  for (let i = 0; i < a.length; i++) {
    if (a[i].code !== b[i].code) return false;
    if (a[i].label !== b[i].label) return false;
    if (a[i].stockQuantity !== b[i].stockQuantity) return false;
  }
  return true;
};

// inputs existing DB record + new payload, does compare every field the payload sets, returns true if identical
const productMatchesPayload = (
  existing: TExistingProduct,
  payload: Record<string, unknown>,
): boolean => {
  for (const key of Object.keys(payload)) {
    const newVal = payload[key];
    if (newVal === undefined) continue;

    if (key === 'category') {
      const existingCatId = (existing.category as { documentId?: string } | null | undefined)?.documentId ?? null;
      if (existingCatId !== newVal) return false;
      continue;
    }

    if (key === 'variants') {
      if (!variantsMatch(existing.variants, newVal as ReadonlyArray<{ code: string; label: string; stockQuantity?: number }>)) {
        return false;
      }
      continue;
    }

    if (key === 'price') {
      // Strapi may return decimal as string
      if (Number(existing.price) !== Number(newVal)) return false;
      continue;
    }

    // Scalar — treat null/undefined as equivalent
    const a = existing[key] ?? null;
    const b = newVal ?? null;
    if (a !== b) return false;
  }
  return true;
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
        const needFullData = options.mode === 'update' && !options.dryRun;
        const tLookup = performance.now();
        const existing = await findExistingProduct(strapi, article, payload.slug, needFullData);
        job.timings.lookup.count += 1;
        job.timings.lookup.totalMs += performance.now() - tLookup;

        const hasDriveUrl = articleRows.some((r) => (r['Для Михаила'] || '').trim() !== '');

        if (existing && options.mode === 'skip') {
          job.skipped += 1;
          pushLog(job, `${prefix}: SKIP (existing)`);
          job.processed = i;
          continue;
        }

        // Refuse to create new products without a Drive URL — the CSV is missing
        // photo data for them and the resulting "немає зображення" placeholders
        // pollute the catalog. Existing products are not affected.
        if (!existing && !hasDriveUrl) {
          job.skipped += 1;
          pushLog(job, `${prefix}: SKIP (no Drive URL — won't create product without photo)`);
          job.processed = i;
          continue;
        }

        if (options.dryRun) {
          pushLog(job, `${prefix}: DRY-RUN ${payload.title}`);
          job.processed = i;
          continue;
        }

        if (existing && options.mode === 'update') {
          if (productMatchesPayload(existing, payload as unknown as Record<string, unknown>)) {
            job.unchanged += 1;
            pushLog(job, `${prefix}: UNCHANGED`);
            job.processed = i;
            continue;
          }
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
    pushLog(job, `=== DONE === created=${job.created} updated=${job.updated} unchanged=${job.unchanged} skipped=${job.skipped} failed=${job.failed.length} photoFailed=${job.photoFailed.length}`);
    pushLog(job, `=== TIMINGS ===`);
    pushLog(job, `Wall clock: ${fmtTotal(wallClockMs)}`);
    pushLog(job, `Lookup: avg ${fmtAvg(job.timings.lookup)} × ${job.timings.lookup.count} = ${fmtTotal(job.timings.lookup.totalMs)}`);
    pushLog(job, `Create: avg ${fmtAvg(job.timings.create)} × ${job.timings.create.count} = ${fmtTotal(job.timings.create.totalMs)}`);
    pushLog(job, `Update: avg ${fmtAvg(job.timings.update)} × ${job.timings.update.count} = ${fmtTotal(job.timings.update.totalMs)}`);
    pushLog(job, `Photo:  avg ${fmtAvg(job.timings.photo)} × ${job.timings.photo.count} = ${fmtTotal(job.timings.photo.totalMs)}`);

    if (isAiEnabled()) {
      job.aiSummaryStatus = 'pending';
      void generateSummary(job)
        .then((text) => {
          job.aiSummary = text;
          job.aiSummaryStatus = 'done';
          pushLog(job, `AI summary згенеровано (${text.length} симв.)`);
        })
        .catch((err: unknown) => {
          const message = err instanceof Error ? err.message : String(err);
          job.aiSummaryStatus = 'failed';
          job.aiSummaryError = message;
          pushLog(job, `AI summary FAIL: ${message}`);
          strapi.log.warn(`${PROGRESS_LOG_TAG} AI summary failed for ${jobId}: ${message}`);
        });
    } else {
      job.aiSummaryStatus = 'disabled';
    }
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

  // inputs nothing, does count products in DB, returns count
  async countProducts(): Promise<number> {
    return (await strapi.documents('api::product.product').count({})) as number;
  },

  // inputs nothing, does delete all products in batches, returns { deleted, durationMs }
  async purgeAllProducts(): Promise<{ deleted: number; durationMs: number }> {
    const t0 = performance.now();
    let deleted = 0;
    const pageSize = 100;
    /* eslint-disable no-constant-condition */
    while (true) {
      const batch = (await strapi.documents('api::product.product').findMany({
        fields: ['documentId'] as never,
        pagination: { page: 1, pageSize },
      })) as Array<{ documentId: string }>;
      if (!batch || batch.length === 0) break;
      for (const p of batch) {
        try {
          await strapi.documents('api::product.product').delete({ documentId: p.documentId });
          deleted += 1;
        } catch (e: unknown) {
          strapi.log.warn(`${PROGRESS_LOG_TAG} purge: failed to delete ${p.documentId}: ${(e as Error).message}`);
        }
      }
      if (batch.length < pageSize) break;
    }
    return { deleted, durationMs: performance.now() - t0 };
  },
});
