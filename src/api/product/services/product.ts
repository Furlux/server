import { factories } from '@strapi/strapi';

const PRICE_STEP = 100;

export default factories.createCoreService('api::product.product', ({ strapi }) => ({
  // inputs nothing, does aggregate filter metadata via SQL DISTINCT queries, returns filter options + price range
  async getFilterMetadata() {
    const db = strapi.db.connection;

    // Run all queries in parallel
    const [
      genderRows,
      shapeRows,
      collectionYearRows,
      frameMaterialRows,
      lensTypeRows,
      lensMaterialRows,
      priceRow,
      discountRows,
    ] = await Promise.all([
      db('products').distinct('gender').whereNotNull('gender').where('gender', '!=', '').where('status', 'active'),
      db('products').distinct('shape').whereNotNull('shape').where('shape', '!=', '').where('status', 'active'),
      db('products').distinct('collection_year').whereNotNull('collection_year').where('collection_year', '!=', '').where('status', 'active'),
      db('products').distinct('frame_material').whereNotNull('frame_material').where('frame_material', '!=', '').where('status', 'active'),
      db('products').distinct('lens_type').whereNotNull('lens_type').where('lens_type', '!=', '').where('status', 'active'),
      db('products').distinct('lens_material').whereNotNull('lens_material').where('lens_material', '!=', '').where('status', 'active'),
      db('products')
        .where('status', 'active')
        .where('price', '>', 0)
        .min({ min: db.raw('COALESCE(sale_price, price)') })
        .max({ max: db.raw('COALESCE(sale_price, price)') })
        .first(),
      db('products')
        .where('status', 'active')
        .whereNotNull('sale_price')
        .where('sale_price', '>', 0)
        .whereRaw('sale_price < price')
        .where('price', '>', 0)
        .select(db.raw('CAST(ROUND(((price - sale_price) / price * 100) / 10) * 10 AS INTEGER) as discount_group'))
        .groupBy('discount_group')
        .orderBy('discount_group', 'desc'),
    ]);

    const toValues = (rows: Record<string, unknown>[], key: string): string[] =>
      rows.map((r) => String(r[key])).filter(Boolean).sort((a, b) => a.localeCompare(b));

    const minPrice = typeof priceRow?.min === 'number' ? priceRow.min : 0;
    const maxPrice = typeof priceRow?.max === 'number' ? priceRow.max : 10000;

    return {
      gender: toValues(genderRows, 'gender'),
      shape: toValues(shapeRows, 'shape'),
      collectionYear: toValues(collectionYearRows, 'collection_year'),
      frameMaterial: toValues(frameMaterialRows, 'frame_material'),
      lensType: toValues(lensTypeRows, 'lens_type'),
      lensMaterial: toValues(lensMaterialRows, 'lens_material'),
      discount: discountRows
        .map((r: Record<string, unknown>) => String(r.discount_group))
        .filter((v: string) => v && v !== '0' && Number(v) < 100),
      priceRange: {
        min: Math.floor(minPrice / PRICE_STEP) * PRICE_STEP,
        max: Math.ceil(maxPrice / PRICE_STEP) * PRICE_STEP,
      },
    };
  },
}));
