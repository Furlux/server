const API_URL = "http://localhost:1337/api";
const TOKEN = "431d9bcec005ea2fadee5fc14fde21acc143a89c46b5499258c280adb8025c3e49960d7ae0aa15dc651ae798410045cac30edb876830c65e1984a086e4b74c4cbf7d9244d8d6fdcd312abfd90d57bdee4007a6cee3d3c33a6e82c1f35c774b00690eb8931a584b09d519dd99324e098c9772bb0383056081da876661dc7e09bc";

const desc = (text) => [{ type: "paragraph", children: [{ type: "text", text }] }];

const PRODUCTS = [
  // === STANDARD (12 items) — one model, one color, best format ===
  {
    title: "Aviator Classic GS41-X",
    slug: "aviator-classic-gs41x",
    price: 2890, salePrice: 2290, currency: "UAH",
    description: desc("Класичні авіатори з поляризованими лінзами та тонкою металевою оправою. Забезпечують чітке бачення без відблисків."),
    available: true, isNew: true, isFeatured: true, brand: "Furlux",
    gender: "men", shape: "aviator", collectionYear: "y2025",
    frameMaterial: "metal", lensType: "polarized", lensMaterial: "glass",
    uvProtection: "UV400", photoFormat: "standard",
  },
  {
    title: "Cat Eye Noir",
    slug: "cat-eye-noir",
    price: 2490, currency: "UAH",
    description: desc("Елегантна жіноча модель у формі котячого ока. Ацетатна оправа з градієнтними лінзами надає образу витонченості."),
    available: true, isNew: false, isFeatured: true, brand: "Furlux",
    gender: "women", shape: "cat-eye", collectionYear: "y2025",
    frameMaterial: "acetate", lensType: "gradient", lensMaterial: "mineral",
    uvProtection: "UV400", photoFormat: "standard",
  },
  {
    title: "Urban Square Pro",
    slug: "urban-square-pro",
    price: 3190, salePrice: 2490, currency: "UAH",
    description: desc("Квадратна оправа з пластику преміум-класу. Ідеальна для міського стилю та повсякденного носіння."),
    available: true, isNew: false, isFeatured: true, brand: "Furlux",
    gender: "unisex", shape: "square", collectionYear: "y2026",
    frameMaterial: "plastic", lensType: "polarized", lensMaterial: "glass",
    uvProtection: "UV400", photoFormat: "standard",
  },
  {
    title: "Titanium Pilot X7",
    slug: "titanium-pilot-x7",
    price: 4590, currency: "UAH",
    description: desc("Преміальні авіатори з титановою оправою. Надлегкі та міцні — вага лише 18 грамів. Поляризовані лінзи зі скла."),
    available: true, isNew: true, isFeatured: true, brand: "Furlux",
    gender: "men", shape: "aviator", collectionYear: "y2026",
    frameMaterial: "titanium", lensType: "polarized", lensMaterial: "glass",
    uvProtection: "UV400", photoFormat: "standard",
  },
  {
    title: "Round Vintage",
    slug: "round-vintage",
    price: 2190, currency: "UAH",
    description: desc("Кругла оправа у вінтажному стилі. Металева оправа з градієнтними мінеральними лінзами."),
    available: true, isNew: false, isFeatured: false, brand: "Furlux",
    gender: "unisex", shape: "round", collectionYear: "y2025",
    frameMaterial: "metal", lensType: "gradient", lensMaterial: "mineral",
    uvProtection: "UV400", photoFormat: "standard",
  },
  {
    title: "Butterfly Dream",
    slug: "butterfly-dream",
    price: 2790, salePrice: 2190, currency: "UAH",
    description: desc("Жіночі сонцезахисні окуляри у формі метелика. Ацетатна оправа з градієнтними лінзами у теплих тонах."),
    available: true, isNew: false, isFeatured: true, brand: "Furlux",
    gender: "women", shape: "butterfly", collectionYear: "y2025",
    frameMaterial: "acetate", lensType: "gradient", lensMaterial: "mineral",
    uvProtection: "UV400", photoFormat: "standard",
  },
  {
    title: "Rectangular Slim",
    slug: "rectangular-slim",
    price: 2390, currency: "UAH",
    description: desc("Строга прямокутна оправа з титану. Класичний діловий стиль з поляризованими лінзами."),
    available: true, isNew: false, isFeatured: false, brand: "Furlux",
    gender: "men", shape: "rectangular", collectionYear: "y2025",
    frameMaterial: "titanium", lensType: "polarized", lensMaterial: "glass",
    uvProtection: "UV400", photoFormat: "standard",
  },
  {
    title: "Oval Elegance",
    slug: "oval-elegance",
    price: 2290, currency: "UAH",
    description: desc("Овальна оправа з металу — м'яка та жіночна форма. Градієнтні мінеральні лінзи забезпечують комфорт."),
    available: true, isNew: false, isFeatured: false, brand: "Furlux",
    gender: "women", shape: "oval", collectionYear: "y2025",
    frameMaterial: "metal", lensType: "gradient", lensMaterial: "mineral",
    uvProtection: "UV400", photoFormat: "standard",
  },
  {
    title: "Panto Retro",
    slug: "panto-retro",
    price: 2690, currency: "UAH",
    description: desc("Оправа панто — культовий ретро-силует. Ацетат преміум-якості з поляризованими лінзами."),
    available: true, isNew: true, isFeatured: false, brand: "Furlux",
    gender: "unisex", shape: "panto", collectionYear: "y2026",
    frameMaterial: "acetate", lensType: "polarized", lensMaterial: "glass",
    uvProtection: "UV400", photoFormat: "standard",
  },
  {
    title: "Sport Mask Ultra",
    slug: "sport-mask-ultra",
    price: 3490, salePrice: 2790, currency: "UAH",
    description: desc("Спортивна маска з обтічною формою. Поляризовані лінзи з мінерального скла забезпечують максимальний захист."),
    available: true, isNew: false, isFeatured: false, brand: "Furlux",
    gender: "men", shape: "mask", collectionYear: "y2026",
    frameMaterial: "plastic", lensType: "polarized", lensMaterial: "mineral",
    uvProtection: "UV400", photoFormat: "standard",
  },
  {
    title: "Rounded Soft",
    slug: "rounded-soft",
    price: 2190, currency: "UAH",
    description: desc("Закруглена оправа з м'якими лініями. Ацетат у натуральних тонах з градієнтними лінзами."),
    available: true, isNew: false, isFeatured: false, brand: "Furlux",
    gender: "women", shape: "rounded", collectionYear: "y2025",
    frameMaterial: "acetate", lensType: "gradient", lensMaterial: "mineral",
    uvProtection: "UV400", photoFormat: "standard",
  },
  {
    title: "Geometric Edge",
    slug: "geometric-edge",
    price: 2890, currency: "UAH",
    description: desc("Нестандартна геометрична оправа для сміливих. Металева конструкція з поляризованими лінзами."),
    available: true, isNew: true, isFeatured: true, brand: "Furlux",
    gender: "unisex", shape: "non-standard", collectionYear: "y2026",
    frameMaterial: "metal", lensType: "polarized", lensMaterial: "glass",
    uvProtection: "UV400", photoFormat: "standard",
  },

  // === CATALOG (8 items) — multi-color photo, with variants ===
  {
    title: "Chameleon 5a2661",
    slug: "chameleon-5a2661",
    price: 1890, currency: "UAH",
    description: desc("Квадратна оправа з подвійним мостиком у стилі Tom Ford. Доступна у 5 кольорах."),
    available: true, isNew: false, isFeatured: false, brand: "Furlux",
    gender: "men", shape: "square", collectionYear: "y2025",
    frameMaterial: "plastic", lensType: "gradient", lensMaterial: "mineral",
    uvProtection: "UV400", photoFormat: "catalog",
    variants: [
      { code: "C3", label: "Сірий" },
      { code: "C5", label: "Зелений" },
      { code: "C6", label: "Коричневий" },
      { code: "C7", label: "Блакитний" },
      { code: "C8", label: "Чорний" },
    ],
  },
  {
    title: "Navigator 8820",
    slug: "navigator-8820",
    price: 2190, salePrice: 1690, currency: "UAH",
    description: desc("Навігатор з металевою оправою. Класичний чоловічий силует у 4 колірних рішеннях."),
    available: true, isNew: false, isFeatured: false, brand: "Furlux",
    gender: "men", shape: "aviator", collectionYear: "y2025",
    frameMaterial: "metal", lensType: "polarized", lensMaterial: "glass",
    uvProtection: "UV400", photoFormat: "catalog",
    variants: [
      { code: "C1", label: "Золотий/Коричневий" },
      { code: "C2", label: "Сріблястий/Сірий" },
      { code: "C3", label: "Чорний/Зелений" },
      { code: "C4", label: "Gunmetal/Синій" },
    ],
  },
  {
    title: "Glamour Cat 7715",
    slug: "glamour-cat-7715",
    price: 2490, currency: "UAH",
    description: desc("Котяче око з ацетатною оправою для жінок. Градієнтні лінзи у 3 варіантах кольору."),
    available: true, isNew: true, isFeatured: false, brand: "Furlux",
    gender: "women", shape: "cat-eye", collectionYear: "y2026",
    frameMaterial: "acetate", lensType: "gradient", lensMaterial: "mineral",
    uvProtection: "UV400", photoFormat: "catalog",
    variants: [
      { code: "C1", label: "Чорний" },
      { code: "C2", label: "Тортуга" },
      { code: "C3", label: "Бордовий" },
    ],
  },
  {
    title: "Round Classic 3301",
    slug: "round-classic-3301",
    price: 1690, currency: "UAH",
    description: desc("Класичні круглі окуляри в ретро-стилі. Металева оправа, доступні у 4 кольорах."),
    available: true, isNew: false, isFeatured: false, brand: "Furlux",
    gender: "unisex", shape: "round", collectionYear: "y2025",
    frameMaterial: "metal", lensType: "gradient", lensMaterial: "mineral",
    uvProtection: "UV400", photoFormat: "catalog",
    variants: [
      { code: "C1", label: "Золотий" },
      { code: "C2", label: "Сріблястий" },
      { code: "C3", label: "Рожевий" },
      { code: "C4", label: "Чорний" },
    ],
  },
  {
    title: "Wayfarer Street 5510",
    slug: "wayfarer-street-5510",
    price: 1990, salePrice: 1590, currency: "UAH",
    description: desc("Квадратна оправа у стилі вейфарер. Пластик преміум-класу у 3 кольорових варіантах."),
    available: true, isNew: false, isFeatured: false, brand: "Furlux",
    gender: "unisex", shape: "square", collectionYear: "y2025",
    frameMaterial: "plastic", lensType: "polarized", lensMaterial: "glass",
    uvProtection: "UV400", photoFormat: "catalog",
    variants: [
      { code: "C1", label: "Матовий чорний" },
      { code: "C2", label: "Тортуга" },
      { code: "C3", label: "Прозорий" },
    ],
  },
  {
    title: "Butterfly Glam 9920",
    slug: "butterfly-glam-9920",
    price: 2690, currency: "UAH",
    description: desc("Великі жіночі окуляри у формі метелика. Доступні у 4 кольорах оправи."),
    available: true, isNew: false, isFeatured: false, brand: "Furlux",
    gender: "women", shape: "butterfly", collectionYear: "y2026",
    frameMaterial: "acetate", lensType: "gradient", lensMaterial: "mineral",
    uvProtection: "UV400", photoFormat: "catalog",
    variants: [
      { code: "C1", label: "Чорний" },
      { code: "C2", label: "Бежевий" },
      { code: "C3", label: "Рожевий" },
      { code: "C4", label: "Синій" },
    ],
  },
  {
    title: "Shield Sport 4400",
    slug: "shield-sport-4400",
    price: 2290, currency: "UAH",
    description: desc("Спортивна маска з широким оглядом. Поляризовані лінзи у 3 кольорах."),
    available: true, isNew: false, isFeatured: false, brand: "Furlux",
    gender: "men", shape: "mask", collectionYear: "y2026",
    frameMaterial: "plastic", lensType: "polarized", lensMaterial: "mineral",
    uvProtection: "UV400", photoFormat: "catalog",
    variants: [
      { code: "C1", label: "Чорний/Сірий" },
      { code: "C2", label: "Білий/Синій" },
      { code: "C3", label: "Чорний/Червоний" },
    ],
  },
  {
    title: "Oval Luxe 6650",
    slug: "oval-luxe-6650",
    price: 2390, salePrice: 1890, currency: "UAH",
    description: desc("Овальна оправа з тонкого металу. Мінімалістичний дизайн у 3 кольорах."),
    available: true, isNew: false, isFeatured: false, brand: "Furlux",
    gender: "women", shape: "oval", collectionYear: "y2025",
    frameMaterial: "metal", lensType: "gradient", lensMaterial: "mineral",
    uvProtection: "UV400", photoFormat: "catalog",
    variants: [
      { code: "C1", label: "Золотий" },
      { code: "C2", label: "Сріблястий" },
      { code: "C3", label: "Рожеве золото" },
    ],
  },

  // === LEGACY (5 items) — old format photos with watermarks ===
  {
    title: "Classic Aviator EH21078",
    slug: "classic-aviator-eh21078",
    price: 1590, currency: "UAH",
    description: desc("Класичні авіатори з металевою оправою. Перевірена часом модель з поляризованими лінзами."),
    available: true, isNew: false, isFeatured: false, brand: "Furlux",
    gender: "unisex", shape: "aviator", collectionYear: "y2025",
    frameMaterial: "metal", lensType: "polarized", lensMaterial: "glass",
    uvProtection: "UV400", photoFormat: "legacy",
  },
  {
    title: "Square Bold F-2240",
    slug: "square-bold-f2240",
    price: 1490, salePrice: 990, currency: "UAH",
    description: desc("Квадратна оправа з товстого пластику. Масивний силует для яскравого образу."),
    available: true, isNew: false, isFeatured: false, brand: "Furlux",
    gender: "men", shape: "square", collectionYear: "y2025",
    frameMaterial: "plastic", lensType: "gradient", lensMaterial: "mineral",
    uvProtection: "UV400", photoFormat: "legacy",
  },
  {
    title: "Round Wire F-1180",
    slug: "round-wire-f1180",
    price: 1290, currency: "UAH",
    description: desc("Тонка кругла оправа з дроту. Мінімалістичний ретро-дизайн."),
    available: true, isNew: false, isFeatured: false, brand: "Furlux",
    gender: "unisex", shape: "round", collectionYear: "y2025",
    frameMaterial: "metal", lensType: "gradient", lensMaterial: "mineral",
    uvProtection: "UV400", photoFormat: "legacy",
  },
  {
    title: "Cat Eye Retro F-3350",
    slug: "cat-eye-retro-f3350",
    price: 1390, currency: "UAH",
    description: desc("Котяче око у ретро-стилі. Пластикова оправа з градієнтними лінзами."),
    available: true, isNew: false, isFeatured: false, brand: "Furlux",
    gender: "women", shape: "cat-eye", collectionYear: "y2025",
    frameMaterial: "plastic", lensType: "gradient", lensMaterial: "mineral",
    uvProtection: "UV400", photoFormat: "legacy",
  },
  {
    title: "Rectangular Pro F-4410",
    slug: "rectangular-pro-f4410",
    price: 1690, salePrice: 1290, currency: "UAH",
    description: desc("Прямокутна оправа для ділового стилю. Метал з поляризованими лінзами."),
    available: true, isNew: false, isFeatured: false, brand: "Furlux",
    gender: "men", shape: "rectangular", collectionYear: "y2025",
    frameMaterial: "metal", lensType: "polarized", lensMaterial: "glass",
    uvProtection: "UV400", photoFormat: "legacy",
  },
];

async function main() {
  console.log(`Seeding ${PRODUCTS.length} products...\n`);

  for (const product of PRODUCTS) {
    const res = await fetch(`${API_URL}/products`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({ data: product }),
    });

    if (res.ok) {
      const json = await res.json();
      const flags = [
        product.isFeatured && "featured",
        product.salePrice && `sale ${Math.round((1 - product.salePrice / product.price) * 100)}%`,
        product.isNew && "new",
        product.photoFormat,
        product.variants?.length && `${product.variants.length} variants`,
      ].filter(Boolean).join(", ");
      console.log(`  OK  ${product.slug} [${flags}]`);
    } else {
      const err = await res.text();
      console.log(`FAIL  ${product.slug}: ${err.slice(0, 120)}`);
    }
  }

  console.log("\nDone!");
}

main().catch(console.error);
