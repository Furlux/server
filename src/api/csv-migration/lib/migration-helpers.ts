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

// Maps CSV "Категорія" column values to DB category slugs. Slugs on the right
// MUST match what the categories actually have in the database, otherwise
// categories.get(slug) returns undefined and the product gets no category
// assignment. Verified against prod DB: soniachni / polaryzovani / hameleony /
// kompiuterni (not the natural transliteration). Multiple keys map to the same
// slug because the CSV occasionally has typos ("Сонцезахині" without 'с') or
// uses shorter/longer variants of the category name.
export const CATEGORY_NAME_TO_SLUG: Record<string, string> = {
  'Сонцезахисні': 'soniachni',
  'Сонцезахині': 'soniachni',
  'Поляризовані': 'polaryzovani',
  'Хамелеон': 'hameleony',
  'Хамелеони': 'hameleony',
  "Комп'ютер/імідж": 'kompiuterni',
  "Комп'ютерні": 'kompiuterni',
  'Іміджеві': 'kompiuterni',
};

export const CLIPON_CATEGORY_SLUG = 'klipony';

const LENS_MAP: Record<string, string> = {
  'Сонцезахисні': 'сонцезахисні',
  'Сонцезахині': 'сонцезахисні',
  'Поляризовані': 'поляризовані',
  'Хамелеон': 'хамелеон',
  'Хамелеони': 'хамелеон',
  "Комп'ютер/імідж": "комп'ютер",
  "Комп'ютерні": "комп'ютер",
  'Іміджеві': "комп'ютер",
};

const GENDER_MAP: Record<string, 'children' | 'women' | 'men' | 'unisex'> = {
  'Жіночі': 'women',
  'Унісекс': 'unisex',
  'Чоловічі': 'men',
  'Дитячі': 'children',
  'Дитяча': 'children',
  'Діти': 'children',
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

// inputs raw "Товар" value, does strip color/variant suffix and "б/і" marker, returns trimmed base title
// Strategy (apply in order, first match wins):
//   1. Drop "б/і" marker so it never contaminates the key.
//   2. C-code pattern: " C1 чорний" / " С12 синій" → cut from the C-code onwards.
//   3. Lens-type heuristic for titles without a C-code: locate the lens-type keyword
//      (поляризовані / сонцезахисні / хамелеон / комп / нейлон / іміджеві), optionally
//      keep the next gender word (дитячі / жіночі / чоловічі), drop the rest as colour.
//   4. Nothing matched → return the title as-is (prefer over-split to mis-merge).
// Unicode-aware word boundary for cyrillic: `\b` and `\w` in JS only see ASCII,
// so we use lookarounds over Unicode letter/number property classes instead.
const LENS_TYPE_RE = /(?<![\p{L}\p{N}])(сонцезахисн[\p{L}]*|поляризован[\p{L}]*|хамелеон[\p{L}]*|комп(?:['ʼ]?ютерн[\p{L}]*)?|нейлон[\p{L}]*|іміджев[\p{L}]*|імідж|скло|стекло|маленьк[\p{L}]*)(?![\p{L}\p{N}])/iu;
const LENS_TYPE_RE_GLOBAL = /(?<![\p{L}\p{N}])(сонцезахисн[\p{L}]*|поляризован[\p{L}]*|хамелеон[\p{L}]*|комп(?:['ʼ]?ютерн[\p{L}]*)?|нейлон[\p{L}]*|іміджев[\p{L}]*|імідж|скло|стекло|маленьк[\p{L}]*)(?![\p{L}\p{N}])/giu;
const GENDER_TAIL_RE = /^(дитяч[\p{L}]*|жіноч[\p{L}]*|чоловіч[\p{L}]*)(?![\p{L}\p{N}])/iu;

// Ukrainian colour stems used to detect a trailing colour suffix in the
// stored title. We match the stem, then absorb any gender/case ending —
// "чорн" covers чорний/чорна/чорне/чорному; "дзерк" covers дзеркальний.
// Compound colours joined by "/" or "-" ("дзерк/жовтий", "темно-зелений")
// are absorbed by the inner alternation. Order doesn't matter.
const COLOR_STEMS = [
  'чорн', 'біл', 'червон', 'зелен', 'син', 'блакитн', 'рожев', 'бузков',
  'малинов', 'жовт', 'бежев', 'коричнев', 'фіолетов', 'сір', 'золот',
  'сріб', 'бордов', 'оранжев', 'помаранчев', 'бронзов', 'перлин', 'металік',
  'темн', 'світл', 'дзеркальн', 'дзерк', 'прозор', 'матов', 'глянц',
  'градієнт', 'хакі', 'кремов', 'шоколад', 'корал', 'лілов', 'нюд',
  'ванільн', 'мідн', 'нейтральн', 'тіл',
] as const;
const COLOR_ALT = COLOR_STEMS.join('|');
const TRAILING_COLOR_RE = new RegExp(
  `\\s+(?:(?:${COLOR_ALT})[\\p{L}]*(?:[\\/\\-](?:${COLOR_ALT})[\\p{L}]*)*)\\s*$`,
  'iu',
);
const TRAILING_C_CODE_RE = /\s+[CСcс]\d+[\w\-]*\s*$/u;

// inputs raw title, does iteratively strip trailing C-code + colour run, returns clean display title
// Safety: only strips when the title actually has a lens-type keyword
// (поляризовані/сонцезахисні/etc.) — without that anchor we can't tell a
// trailing colour word apart from a proper noun, so we'd rather leave the
// title intact than over-strip something like "Окуляри Чорний бриз".
const stripTrailingColorAndCode = (title: string): string => {
  if (!title || !LENS_TYPE_RE.test(title)) return title;
  let result = title.trimEnd();
  for (let i = 0; i < 8; i += 1) {
    const next = result
      .replace(TRAILING_C_CODE_RE, '')
      .replace(TRAILING_COLOR_RE, '')
      .trimEnd();
    if (next === result) break;
    result = next;
  }
  return result;
};

export const cleanTitleForGrouping = (rawTitle: string): string => {
  if (!rawTitle) return '';
  let cleaned = rawTitle.replace(/\s+б[\/\\]і\s+/i, ' ').trim();

  // Layer 1: "<base> C\d+ <color>" → "<base>"
  const cCode = cleaned.match(/^(.+?)\s+[CСcс]\d+(?![\p{L}\p{N}])/u);
  if (cCode) {
    return cCode[1].trim();
  }

  // Layer 2: lens-type anchor — keep title up to and including the lens type,
  // plus optional immediate gender word ("дитячі чорний" → keep "дитячі", drop "чорний").
  const lens = cleaned.match(LENS_TYPE_RE);
  if (lens && lens.index !== undefined) {
    const endOfLens = lens.index + lens[0].length;
    const head = cleaned.substring(0, endOfLens);
    const tail = cleaned.substring(endOfLens).trim();
    const genderTail = tail.match(GENDER_TAIL_RE);
    if (genderTail) {
      return `${head} ${genderTail[0]}`.trim();
    }
    return head.trim();
  }

  return cleaned;
};

// inputs raw "Товар" value, does normalize cleaned title for grouping (case/whitespace insensitive), returns key fragment
const titleGroupingKey = (rawTitle: string): string => slugify(cleanTitleForGrouping(rawTitle));

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

  // Strategy 4: find the LAST lens-type anchor in the title — for chains like
  // "...маленькі скло чорний..." we want to peel off everything starting from
  // the colour, not after the first qualifier word.
  const allLens = [...title.matchAll(LENS_TYPE_RE_GLOBAL)];
  if (allLens.length > 0) {
    const last = allLens[allLens.length - 1];
    const afterLens = title.substring((last.index ?? 0) + last[0].length).trim();
    if (afterLens) {
      return { code: `V${index + 1}`, label: capitalize(afterLens) };
    }
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

// inputs CSV value + lookup map, does case-insensitive trimmed lookup, returns mapped value or undefined
// Falls back to case-insensitive comparison when the exact key isn't present,
// so the CSV can use "дитячі" or "Дитячі " (with trailing space) without breaking.
const findInMap = <V>(key: string, map: Record<string, V>): V | undefined => {
  if (!key) return undefined;
  const direct = map[key];
  if (direct !== undefined) return direct;
  const needle = key.toLowerCase().trim();
  if (!needle) return undefined;
  for (const [k, v] of Object.entries(map)) {
    if (k.toLowerCase().trim() === needle) return v;
  }
  return undefined;
};

// inputs raw title, does detect gender keyword embedded in the title, returns gender or undefined
// Last-resort fallback for rows whose "Стать" CSV column is empty but whose title
// contains "дитячі"/"жіночі"/"чоловічі"/"унісекс" anyway. Unicode lookbehinds keep
// the match anchored at a word boundary (JS \b is ASCII-only).
const inferGenderFromTitle = (
  title: string,
): 'children' | 'women' | 'men' | 'unisex' | undefined => {
  if (!title) return undefined;
  const t = title.toLowerCase();
  if (/(?<![\p{L}])(дитяч|діт)(?=[\p{L}\s])/u.test(t)) return 'children';
  if (/(?<![\p{L}])жіноч/u.test(t)) return 'women';
  if (/(?<![\p{L}])чолов/u.test(t)) return 'men';
  if (/(?<![\p{L}])унісек/u.test(t)) return 'unisex';
  return undefined;
};

// inputs article rows + categories map, does build full product payload, returns payload object
export const buildProductPayload = (rows: TCsvRow[], categories: TCategoriesMap): TProductPayload => {
  const first = rows[0];
  const article = (first['Артикул'] || '').trim();

  // For the stored title we drop the "б/і" marker and any trailing colour /
  // C-code suffix. Old CSVs used "<base> C5 чорний" (code first), the current
  // ones use "<base> чорний C5" or just "<base> чорний", and some omit the
  // code entirely. stripTrailingColorAndCode handles all three orderings
  // without dropping the article number — it requires a lens-type keyword
  // to be present before it strips anything, so titles like "Окуляри
  // сонцезахисні Ver 6960 бежевий" become "Окуляри сонцезахисні Ver 6960"
  // (article preserved, colour stripped).
  const rawTitle = first['Товар'] || '';
  let title = rawTitle.replace(/\s+б[\/\\]і\s+/iu, ' ').trim();
  title = stripTrailingColorAndCode(title).trim();

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
  // Unicode-aware "б/і" detection — JS \b is ASCII-only and never matches cyrillic
  const isBrand = !/(?<![\p{L}\p{N}])б[\/\\]і(?![\p{L}\p{N}])/iu.test(titleRaw);
  const isClipon = shapeKey === 'Кліпон';

  // Only use "Ціна гурт $" (USD wholesale). Do NOT fall back to "Сума" — it's in UAH
  // and would be silently misinterpreted as USD by the frontend currency conversion.
  let price = 0;
  for (const r of rows) {
    price = parsePrice(r['Ціна гурт $']);
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
  } else {
    const catSlug = findInMap(catKey, CATEGORY_NAME_TO_SLUG);
    if (catSlug) categoryId = categories.get(catSlug);
  }
  if (categoryId) payload.category = categoryId;

  const mappedGender = findInMap(genderKey, GENDER_MAP);
  if (mappedGender) {
    payload.gender = mappedGender;
  } else {
    const inferred = inferGenderFromTitle(title);
    if (inferred) payload.gender = inferred;
  }

  const mappedFrameType = findInMap(frameTypeKey, FRAME_TYPE_MAP);
  if (mappedFrameType) payload.frameType = mappedFrameType;

  const mappedShape = findInMap(shapeKey, FRAME_SHAPE_MAP);
  if (mappedShape) payload.frameShape = mappedShape;

  const mappedLens = findInMap(catKey, LENS_MAP);
  if (mappedLens) payload.lensType = mappedLens;

  if (variants.length > 0) payload.variants = variants;

  return payload;
};

// inputs raw price string, does normalize for grouping key (handles decimal commas), returns canonical string
const priceKey = (raw: string | undefined): string => {
  if (!raw) return '';
  const cleaned = raw.trim().replace(',', '.');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) && n > 0 ? n.toFixed(2) : '';
};

// inputs rows array, does hybrid grouping: structural CSV columns first, title fingerprint
// only as a tiebreaker for poorly-filled rows. Two rows merge into one product iff their
// composite key matches.
//
// Key shape: `${art}::${cat}::${gender}::${price}::${fingerprint}`
//   - fingerprint is EMPTY when cat+gender+price are all populated (a fully-filled row
//     has enough structural signal to separate physically different products on its own).
//   - fingerprint is the slugified cleaned title only when at least one structural axis
//     is missing — then it acts as a fallback to keep distinct rows from collapsing
//     into one bucket.
//
// Why this shape:
// - CSV has ~10000 rows where Артикул (97%) and Ціна (96%) are well-populated but
//   Категорія / Стать / Матеріал sit around 42%.
// - Fully-filled rows for the same product (e.g. 16 colour variants of 8217) share
//   the same cat+gender+price → drop fingerprint → one bucket → one product with
//   16 variants. Fingerprint as a primary axis was over-splitting because
//   cleanTitleForGrouping can't reliably strip "<colour> C13" off every title.
// - Different products that happen to share an article (907 Армада чоловіча $0.50 vs.
//   907 жіноча $5.00) still split — different gender/price → different keys.
// - Poorly-filled rows fall back to fingerprint disambiguation so they don't collapse
//   into one giant bucket.
// - Worst case (no columns filled, fingerprint can't help): two unrelated rows merge.
//   That's visible as an obvious "weird product" card the operator can split manually —
//   strictly better than silently mixing prices like the old pure-article grouping did.
export const groupByArticle = (rows: TCsvRow[]): Map<string, TCsvRow[]> => {
  const map = new Map<string, TCsvRow[]>();
  for (const r of rows) {
    const art = (r['Артикул'] || '').trim();
    if (!art) continue;
    const catRaw = (r['Категорія'] || '').trim();
    const genderRaw = (r['Стать'] || '').trim();
    const price = priceKey(r['Ціна гурт $']);
    const hasFullStructural = catRaw !== '' && genderRaw !== '' && price !== '';
    const cat = catRaw ? slugify(catRaw) : '';
    const gender = genderRaw ? slugify(genderRaw) : '';
    const fingerprint = hasFullStructural ? '' : titleGroupingKey(r['Товар'] || '');
    const key = `${normalizeArticle(art)}::${cat}::${gender}::${price}::${fingerprint}`;
    const bucket = map.get(key);
    if (bucket) {
      bucket.push(r);
    } else {
      map.set(key, [r]);
    }
  }
  return map;
};
