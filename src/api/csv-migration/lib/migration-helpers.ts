export type TCsvRow = Record<string, string>;

export type TParsedVariant = {
  code: string;
  label: string;
  stockQuantity?: number;
};

export type TCategoriesMap = ReadonlyMap<string, string>;

export type TProductPayload = {
  title: string;
  slug: string;
  articleNumber: string;
  supplierCode: string | null;
  price: number;
  currency: string;
  stockQuantity: number;
  available: boolean;
  isNew: boolean;
  isBrand: boolean;
  hasClipon: boolean;
  productStatus: 'active' | 'archive';
  photoFormat: 'catalog' | 'standard' | 'legacy';
  category?: string;
  gender?: 'children' | 'women' | 'men' | 'unisex';
  frameType?: string;
  frameShape?: string;
  lensType?: string;
  variants?: TParsedVariant[];
};

const TRANSLIT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ye', ж: 'zh', з: 'z',
  и: 'y', і: 'i', ї: 'yi', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p',
  р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch',
  ь: '', ю: 'yu', я: 'ya', "'": '', '"': '',
};

export const CATEGORY_NAME_TO_SLUG: Record<string, string> = {
  'Сонцезахині': 'soncezakhysni',
  'Поляризовані': 'polyaryzovani',
  'Хамелеон': 'khameleon',
  "Комп'ютер/імідж": 'kompiuter',
};

export const CLIPON_CATEGORY_SLUG = 'klipony';

const LENS_MAP: Record<string, string> = {
  'Сонцезахині': 'сонцезахисні',
  'Поляризовані': 'поляризовані',
  'Хамелеон': 'хамелеон',
  "Комп'ютер/імідж": "комп'ютер",
};

const GENDER_MAP: Record<string, 'children' | 'women' | 'men' | 'unisex'> = {
  'Жіночі': 'women',
  'Унісекс': 'unisex',
  'Чоловічі': 'men',
};

const FRAME_TYPE_MAP: Record<string, string> = {
  'Метал': 'метал',
  'Пластик': 'пластик',
  'Безоправні': 'безоправні',
  'Комбінована': 'комбінована',
};

const FRAME_SHAPE_MAP: Record<string, string> = {
  'Авіатор': 'авіатор', 'Багатокутник': 'багатокутник', 'Квадрат': 'квадрат',
  'Круглі': 'круглі', 'Кішка': 'кішка', 'Маска': 'маска', 'Навігатор': 'навігатор',
  'Овал': 'круглі', 'Оверсайз': 'оверсайз', 'Прямокутник': 'прямокутник',
  'Ромб': 'ромби', 'Трапеція': 'трапеція',
};

// inputs text, does slugify Ukrainian text to latin, returns slug
export const slugify = (text: string): string => {
  let out = '';
  for (const ch of text.toLowerCase()) {
    out += TRANSLIT[ch] ?? ch;
  }
  out = out.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return out || 'product';
};

// inputs article string, does normalize for case-insensitive grouping, returns normalized key
export const normalizeArticle = (article: string): string => slugify(article.trim());

// inputs row + index, does parse variant from column/title via 4 strategies, returns parsed variant or null
export const parseVariant = (row: TCsvRow, index: number): TParsedVariant | null => {
  const raw = (row['Варіанти кольорів'] || '').trim();

  if (raw) {
    for (const sep of [':', '^']) {
      if (raw.includes(sep)) {
        const idx = raw.indexOf(sep);
        const code = raw.substring(0, idx).trim();
        const label = raw.substring(idx + 1).trim();
        return { code, label: capitalize(label) };
      }
    }
  }

  const title = row['Товар'] || '';
  const titleMatch = title.match(/\s([CСcс]\d+[\w-]*)\s+(.+?)$/);
  if (titleMatch) {
    return { code: titleMatch[1], label: capitalize(titleMatch[2].trim()) };
  }

  if (raw) {
    return { code: `V${index + 1}`, label: capitalize(raw) };
  }

  const stripped = title.replace(
    /^.*?(?:сонцезахисні|поляризовані|хамелеон|комп'ютерні|іміджеві|нейлон)\s*/i,
    ''
  );
  if (stripped && stripped !== title) {
    return { code: `V${index + 1}`, label: capitalize(stripped.trim()) };
  }

  return null;
};

// inputs string, does uppercase first character, returns capitalized
const capitalize = (s: string): string => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

// inputs raw stock string, does parse integer with comma/dot handling, returns parsed integer
const parseStock = (raw: string | undefined): number => {
  if (!raw) return 0;
  const cleaned = raw.replace(',', '.').split('.')[0] || '0';
  const n = parseInt(cleaned, 10);
  return Number.isFinite(n) ? n : 0;
};

// inputs raw price string, does parse decimal with comma/dot handling, returns float or 0
const parsePrice = (raw: string | undefined): number => {
  if (!raw) return 0;
  const cleaned = raw.trim().replace(',', '.');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

// inputs article rows + categories map, does build full product payload, returns payload object
export const buildProductPayload = (rows: TCsvRow[], categories: TCategoriesMap): TProductPayload => {
  const first = rows[0];
  const article = (first['Артикул'] || '').trim();

  let title = (first['Товар'] || '').replace(/\s+[CСcс]\d+[\w-]*\s+.+$/, '').trim();
  title = title.replace(/\s+б\/і\s+/, ' ').trim();

  const catKey = (first['Категорія'] || '').trim();
  const genderKey = (first['Стать'] || '').trim();
  const frameTypeKey = (first['Матеріал оправи'] || '').trim();
  const shapeKey = (first['Форма '] || first['Форма'] || '').trim();

  const formats = rows.map((r) => (r['Формат фото'] || '').trim());
  let photoFormat: 'catalog' | 'standard' | 'legacy';
  if (formats.includes('Catalog') || rows.length > 1) {
    photoFormat = 'catalog';
  } else if (formats.includes('Standart')) {
    photoFormat = 'standard';
  } else {
    photoFormat = 'legacy';
  }

  const variants: TParsedVariant[] = [];
  let totalStock = 0;
  const supplierCodes: string[] = [];

  rows.forEach((r, idx) => {
    const v = parseVariant(r, idx);
    const rowStock = parseStock(r['Кільк. загальна']);
    totalStock += rowStock;
    if (v) {
      const existing = variants.find((x) => x.code === v.code);
      if (existing) {
        existing.stockQuantity = (existing.stockQuantity ?? 0) + rowStock;
      } else {
        variants.push({ ...v, stockQuantity: rowStock });
      }
    }
    const sc = (r['Код'] || '').trim();
    if (sc) supplierCodes.push(sc);
  });

  const titleRaw = first['Товар'] || '';
  const isBrand = !/\bб[\/\\]і\b/i.test(titleRaw);
  const isClipon = shapeKey === 'Кліпон';

  let price = 0;
  for (const r of rows) {
    for (const col of ['Ціна гурт $', 'Сума']) {
      price = parsePrice(r[col]);
      if (price > 0) break;
    }
    if (price > 0) break;
  }

  const payload: TProductPayload = {
    title,
    slug: `${slugify(title)}-${slugify(article)}`,
    articleNumber: article,
    supplierCode: supplierCodes[0] ?? null,
    price,
    currency: 'USD',
    stockQuantity: totalStock,
    available: totalStock > 0,
    isNew: false,
    isBrand,
    hasClipon: isClipon,
    productStatus: price > 0 ? 'active' : 'archive',
    photoFormat,
  };

  let categoryId: string | undefined;
  if (isClipon) {
    categoryId = categories.get(CLIPON_CATEGORY_SLUG);
  } else if (catKey && CATEGORY_NAME_TO_SLUG[catKey]) {
    categoryId = categories.get(CATEGORY_NAME_TO_SLUG[catKey]);
  }
  if (categoryId) payload.category = categoryId;

  if (genderKey && GENDER_MAP[genderKey]) payload.gender = GENDER_MAP[genderKey];
  if (frameTypeKey && FRAME_TYPE_MAP[frameTypeKey]) payload.frameType = FRAME_TYPE_MAP[frameTypeKey];
  if (shapeKey && FRAME_SHAPE_MAP[shapeKey]) payload.frameShape = FRAME_SHAPE_MAP[shapeKey];
  if (catKey && LENS_MAP[catKey]) payload.lensType = LENS_MAP[catKey];
  if (variants.length > 0) payload.variants = variants;

  return payload;
};

// inputs rows array, does group by article number with case-insensitive normalization, returns Map<normalizedArticle, rows>
export const groupByArticle = (rows: TCsvRow[]): Map<string, TCsvRow[]> => {
  const map = new Map<string, TCsvRow[]>();
  for (const r of rows) {
    const art = (r['Артикул'] || '').trim();
    if (!art) continue;
    const key = normalizeArticle(art);
    const bucket = map.get(key);
    if (bucket) {
      bucket.push(r);
    } else {
      map.set(key, [r]);
    }
  }
  return map;
};
