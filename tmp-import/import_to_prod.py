#!/usr/bin/env python3
"""
inputs local SQLite DB, does POST to Strapi production API, imports categories + products
"""

import sqlite3
import json
import urllib.request
import urllib.error
import sys
import time

# ── Config ─────────────────────────────────────────────────────────────────────
DB_PATH = "../.tmp/data.db"
API_BASE = "https://thoughtful-event-3cadde2cc2.strapiapp.com/api"
API_TOKEN = "c550c428dbb15a15a1054147cbae7785a25365c51e0778d1152de1d49acd2eb25a454ceacac24e97911768f3b6dcfabc79472bb5192018e91fd1ea261e9c520c95966c5e18593cceec974eecc1d68b71e9969ef4962e5278812b1fdfa8974045efdbcf84556deb55d8976b512f90fd4869508643b078317dc877e98c66321ebd"

HEADERS = {
    "Authorization": f"Bearer {API_TOKEN}",
    "Content-Type": "application/json",
}


# ── Helpers ─────────────────────────────────────────────────────────────────────
def api_post(endpoint: str, data: dict) -> dict:
    """inputs endpoint + data dict, does POST to Strapi API, returns response dict"""
    url = f"{API_BASE}/{endpoint}"
    body = json.dumps({"data": data}).encode("utf-8")
    req = urllib.request.Request(url, data=body, headers=HEADERS, method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        print(f"  ERROR {e.code} on {endpoint}: {err_body[:200]}")
        return {}


def api_get(endpoint: str) -> dict:
    """inputs endpoint, does GET to Strapi API, returns response dict"""
    url = f"{API_BASE}/{endpoint}"
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())


# ── Step 1: Check existing categories on prod ──────────────────────────────────
print("Checking existing categories on production...")
existing = api_get("categories?pagination[pageSize]=100&fields[0]=slug&fields[1]=documentId")
existing_slugs = {
    item["slug"]: item["documentId"]
    for item in existing.get("data", [])
}
print(f"  Found {len(existing_slugs)} existing categories: {list(existing_slugs.keys())}")

# ── Step 2: Create categories ──────────────────────────────────────────────────
print("\nCreating categories...")
conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

cur.execute("SELECT id, name, slug, \"order\" FROM categories ORDER BY \"order\"")
categories = cur.fetchall()

# slug → production documentId
cat_doc_id: dict[str, str] = dict(existing_slugs)

created_cats = 0
skipped_cats = 0

for cat in categories:
    slug = cat["slug"]
    if slug in existing_slugs:
        print(f"  SKIP  {slug} (already exists)")
        skipped_cats += 1
        continue

    payload = {
        "name": cat["name"],
        "slug": slug,
        "order": cat["order"],
    }
    resp = api_post("categories", payload)
    doc_id = resp.get("data", {}).get("documentId")
    if doc_id:
        cat_doc_id[slug] = doc_id
        print(f"  OK    {slug} → {doc_id}")
        created_cats += 1
    else:
        print(f"  FAIL  {slug}")
    time.sleep(0.1)

print(f"\nCategories: {created_cats} created, {skipped_cats} skipped")

# ── Step 3: Check existing products on prod ────────────────────────────────────
print("\nChecking existing products on production...")
existing_products = api_get("products?pagination[pageSize]=100&fields[0]=slug&fields[1]=documentId")
existing_product_slugs = {
    item["slug"]: item["documentId"]
    for item in existing_products.get("data", [])
}
print(f"  Found {len(existing_product_slugs)} existing products")

# ── Step 4: Create products ────────────────────────────────────────────────────
print("\nCreating products...")
cur.execute("""
    SELECT
        p.id, p.title, p.slug, p.price, p.currency,
        p.available, p.is_new, p.gender, p.sale_price,
        p.article_number, p.supplier_code, p.stock_quantity,
        p.product_status, p.sizes, p.lens_type, p.is_brand,
        p.frame_type, p.color, p.frame_shape, p.has_clipon,
        p.attributes, p.description,
        c.slug AS cat_slug
    FROM products p
    LEFT JOIN products_category_lnk lnk ON p.id = lnk.product_id
    LEFT JOIN categories c ON lnk.category_id = c.id
    ORDER BY p.id
""")
products = cur.fetchall()
conn.close()

created_prods = 0
skipped_prods = 0
failed_prods = 0

for prod in products:
    slug = prod["slug"]
    if slug in existing_product_slugs:
        print(f"  SKIP  {slug}")
        skipped_prods += 1
        continue

    # parse JSON fields
    color = None
    if prod["color"]:
        try:
            color = json.loads(prod["color"])
        except Exception:
            color = None

    description = None
    if prod["description"]:
        try:
            description = json.loads(prod["description"])
        except Exception:
            description = None

    attributes = None
    if prod["attributes"]:
        try:
            attributes = json.loads(prod["attributes"])
        except Exception:
            attributes = None

    payload: dict = {
        "title": prod["title"],
        "slug": slug,
        "price": prod["price"],
        "currency": prod["currency"] or "UAH",
        "available": bool(prod["available"]),
        "isNew": bool(prod["is_new"]),
        "productStatus": prod["product_status"],
    }

    # optional fields
    if prod["gender"]:
        payload["gender"] = prod["gender"]
    if prod["sale_price"]:
        payload["salePrice"] = prod["sale_price"]
    if prod["article_number"]:
        payload["articleNumber"] = prod["article_number"]
    if prod["supplier_code"]:
        payload["supplierCode"] = prod["supplier_code"]
    if prod["stock_quantity"]:
        payload["stockQuantity"] = prod["stock_quantity"]
    if prod["sizes"]:
        payload["sizes"] = prod["sizes"]
    if prod["lens_type"]:
        payload["lensType"] = prod["lens_type"]
    if prod["is_brand"] is not None:
        payload["isBrand"] = bool(prod["is_brand"])
    if prod["frame_type"]:
        payload["frameType"] = prod["frame_type"]
    if prod["frame_shape"]:
        payload["frameShape"] = prod["frame_shape"]
    if prod["has_clipon"] is not None:
        payload["hasClipon"] = bool(prod["has_clipon"])
    if color is not None:
        payload["color"] = color
    if description is not None:
        payload["description"] = description
    if attributes is not None:
        payload["attributes"] = attributes

    # category relation
    cat_slug = prod["cat_slug"]
    if cat_slug and cat_slug in cat_doc_id:
        payload["category"] = {"connect": [{"documentId": cat_doc_id[cat_slug]}]}

    resp = api_post("products", payload)
    doc_id = resp.get("data", {}).get("documentId")
    if doc_id:
        print(f"  OK    {slug}")
        created_prods += 1
    else:
        print(f"  FAIL  {slug}")
        failed_prods += 1
    time.sleep(0.1)

# ── Summary ────────────────────────────────────────────────────────────────────
print(f"\n{'─'*50}")
print(f"Categories: {created_cats} created, {skipped_cats} skipped")
print(f"Products:   {created_prods} created, {skipped_prods} skipped, {failed_prods} failed")
print("Done.")
