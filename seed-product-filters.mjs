const API_URL = "http://localhost:1337/api";
const TOKEN = "431d9bcec005ea2fadee5fc14fde21acc143a89c46b5499258c280adb8025c3e49960d7ae0aa15dc651ae798410045cac30edb876830c65e1984a086e4b74c4cbf7d9244d8d6fdcd312abfd90d57bdee4007a6cee3d3c33a6e82c1f35c774b00690eb8931a584b09d519dd99324e098c9772bb0383056081da876661dc7e09bc";

const PRODUCT_DATA = {
  "aviator-classic": { gender: "men", shape: "aviator", collectionYear: "y2025", frameMaterial: "metal", lensType: "polarized", lensMaterial: "glass" },
  "double-bridge-tech": { gender: "unisex", shape: "round", collectionYear: "y2026", frameMaterial: "metal", lensType: "gradient", lensMaterial: "mineral" },
  "transparent-frame": { gender: "women", shape: "round", collectionYear: "y2025", frameMaterial: "acetate", lensType: "gradient", lensMaterial: "mineral" },
  "rectangular-slim": { gender: "men", shape: "rectangular", collectionYear: "y2025", frameMaterial: "titanium", lensType: "polarized", lensMaterial: "glass" },
  "teardrop-aviator": { gender: "men", shape: "aviator", collectionYear: "y2026", frameMaterial: "metal", lensType: "polarized", lensMaterial: "glass" },
  "flat-top-street": { gender: "unisex", shape: "square", collectionYear: "y2025", frameMaterial: "acetate", lensType: "gradient", lensMaterial: "mineral" },
  "gradient-dream": { gender: "women", shape: "butterfly", collectionYear: "y2026", frameMaterial: "acetate", lensType: "gradient", lensMaterial: "mineral" },
  "browline-minimal": { gender: "men", shape: "rounded", collectionYear: "y2025", frameMaterial: "acetate", lensType: "polarized", lensMaterial: "glass" },
  "d-frame-bold": { gender: "unisex", shape: "square", collectionYear: "y2026", frameMaterial: "plastic", lensType: "polarized", lensMaterial: "glass" },
  "round-oversized": { gender: "women", shape: "round", collectionYear: "y2025", frameMaterial: "metal", lensType: "gradient", lensMaterial: "mineral" },
  "rimless-air": { gender: "unisex", shape: "non-standard", collectionYear: "y2026", frameMaterial: "titanium", lensType: "polarized", lensMaterial: "glass" },
  "sport-flex": { gender: "men", shape: "mask", collectionYear: "y2026", frameMaterial: "plastic", lensType: "polarized", lensMaterial: "mineral" },
  "hexagon-trend": { gender: "unisex", shape: "non-standard", collectionYear: "y2025", frameMaterial: "metal", lensType: "gradient", lensMaterial: "mineral" },
  "wayfarer-classic": { gender: "unisex", shape: "square", collectionYear: "y2025", frameMaterial: "acetate", lensType: "polarized", lensMaterial: "glass" },
  "cat-eye-slim": { gender: "women", shape: "cat-eye", collectionYear: "y2026", frameMaterial: "acetate", lensType: "gradient", lensMaterial: "mineral" },
  "pilot-titanium": { gender: "men", shape: "aviator", collectionYear: "y2026", frameMaterial: "titanium", lensType: "polarized", lensMaterial: "glass" },
  "oval-classic": { gender: "women", shape: "oval", collectionYear: "y2025", frameMaterial: "metal", lensType: "gradient", lensMaterial: "mineral" },
  "round-vintage": { gender: "unisex", shape: "round", collectionYear: "y2025", frameMaterial: "metal", lensType: "gradient", lensMaterial: "glass" },
  "square-modern": { gender: "men", shape: "square", collectionYear: "y2026", frameMaterial: "plastic", lensType: "polarized", lensMaterial: "mineral" },
};

const DEFAULT_DATA = { gender: "unisex", shape: "panto", collectionYear: "y2025", frameMaterial: "acetate", lensType: "gradient", lensMaterial: "mineral" };

async function main() {
  const res = await fetch(`${API_URL}/products?fields[0]=title&fields[1]=slug&pagination[pageSize]=100`, {
    headers: { "Authorization": `Bearer ${TOKEN}` },
  });
  const json = await res.json();
  const products = json.data ?? [];

  console.log(`Found ${products.length} products`);

  for (const product of products) {
    const data = PRODUCT_DATA[product.slug] ?? DEFAULT_DATA;
    console.log(`Updating ${product.slug} (${product.documentId})...`);

    const updateRes = await fetch(`${API_URL}/products/${product.documentId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${TOKEN}` },
      body: JSON.stringify({ data }),
    });

    if (!updateRes.ok) {
      const err = await updateRes.text();
      console.error(`  FAILED: ${updateRes.status} ${err.slice(0, 100)}`);
    } else {
      console.log(`  OK`);
    }
  }

  console.log("Done!");
}

main().catch(console.error);
