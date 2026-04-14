import { factories } from '@strapi/strapi';

const PRICE_STEP = 100;

type Row = Record<string, unknown>;
type PriceRow = { min: number; max: number } | undefined;

export default factories.createCoreService('api::product.product', ({ strapi }) => ({
  // inputs nothing, does aggregate filter metadata via SQL DISTINCT queries, returns filter options + price range
  async getFilterMetadata() {
    const db = strapi.db.connection;

    strapi.log.info('[filter-metadata] starting queries');

    const safeRows = async (label: string, query: Promise<Row[]>): Promise<Row[]> => {
      try {
        const result = await query;
        strapi.log.info(`[filter-metadata] ${label} OK rows=${Array.isArray(result) ? result.length : '?'}`);
        return Array.isArray(result) ? result : [];
      } catch (e) {
        strapi.log.error(`[filter-metadata] ${label} FAILED:`, e);
        return [];
      }
    };

    const safePriceRow = async (query: Promise<PriceRow>): Promise<PriceRow> => {
      try {
        const result = await query;
        strapi.log.info(`[filter-metadata] price OK min=${result?.min} max=${result?.max}`);
        return result;
      } catch (e) {
        strapi.log.error('[filter-metadata] price FAILED:', e);
        return undefined;
      }
    };

    const dbClient = strapi.config.get('database.connection.client') as string;
    strapi.log.info(`[filter-metadata] dbClient=${dbClient}`);

    const [
      genderRows,
      lensTypeRows,
      frameTypeRows,
      frameShapeRows,
      priceRow,
      discountRows,
    ] = await Promise.all([
      safeRows('gender', db('products').distinct('gender').whereNotNull('gender').where('gender', '!=', '').where('product_status', 'active')),
      safeRows('lens_type', db('products').distinct('lens_type').whereNotNull('lens_type').where('lens_type', '!=', '').where('product_status', 'active')),
      safeRows('frame_type', db('products').distinct('frame_type').whereNotNull('frame_type').where('frame_type', '!=', '').where('product_status', 'active')),
      safeRows('frame_shape', db('products').distinct('frame_shape').whereNotNull('frame_shape').where('frame_shape', '!=', '').where('product_status', 'active')),
      safePriceRow(db('products')
        .where('product_status', 'active')
        .where('price', '>', 0)
        .min({ min: db.raw('COALESCE(sale_price, price)') })
        .max({ max: db.raw('COALESCE(sale_price, price)') })
        .first() as Promise<PriceRow>),
      safeRows('discount', db('products')
        .where('product_status', 'active')
        .whereNotNull('sale_price')
        .where('sale_price', '>', 0)
        .whereRaw('sale_price < price')
        .where('price', '>', 0)
        .select(db.raw('CAST(ROUND(((price - sale_price) / price * 100) / 10) * 10 AS INTEGER) as discount_group'))
        .groupBy('discount_group')
        .orderBy('discount_group', 'desc')),
    ]);

    const toValues = (rows: Row[], key: string): string[] =>
      rows.map((r) => String(r[key])).filter(Boolean).sort((a, b) => a.localeCompare(b));

    // Color query uses json_each (SQLite) or jsonb_array_elements_text (PostgreSQL)
    let colorValues: string[] = [];
    try {
      const colorSql = dbClient === 'sqlite'
        ? `SELECT DISTINCT j.value as color_value FROM products p, json_each(p.color) j WHERE p.product_status = 'active' AND p.color IS NOT NULL AND p.color NOT IN ('null', '[]')`
        : `SELECT DISTINCT jsonb_array_elements_text(color::jsonb) as color_value FROM products WHERE product_status = 'active' AND color IS NOT NULL AND color NOT IN ('null', '[]')`;
      const colorResult = await db.raw(colorSql);
      // SQLite (better-sqlite3): raw returns rows[] directly; PostgreSQL: { rows: [] }
      const colorRows = Array.isArray(colorResult) ? colorResult : (colorResult?.rows ?? []);
      colorValues = (Array.isArray(colorRows) ? colorRows : [])
        .map((r: Row) => String(r.color_value))
        .filter(Boolean)
        .sort((a: string, b: string) => a.localeCompare(b));
      strapi.log.info(`[filter-metadata] color OK count=${colorValues.length}`);
    } catch (e) {
      strapi.log.warn('[filter-metadata] color FAILED:', e);
    }

    const minPrice = typeof priceRow?.min === 'number' ? priceRow.min : 0;
    const maxPrice = typeof priceRow?.max === 'number' ? priceRow.max : 10000;

    strapi.log.info('[filter-metadata] done');

    return {
      gender: toValues(genderRows, 'gender'),
      lensType: toValues(lensTypeRows, 'lens_type'),
      frameType: toValues(frameTypeRows, 'frame_type'),
      frameShape: toValues(frameShapeRows, 'frame_shape'),
      color: colorValues,
      discount: discountRows
        .map((r) => String(r.discount_group))
        .filter((v) => v && v !== '0' && Number(v) < 100),
      priceRange: {
        min: Math.floor(minPrice / PRICE_STEP) * PRICE_STEP,
        max: Math.ceil(maxPrice / PRICE_STEP) * PRICE_STEP,
      },
    };
  },
}));
