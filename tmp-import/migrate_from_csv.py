#!/usr/bin/env python3
"""
Migrate products from cleaned CSV to Strapi Cloud prod.
Groups rows by articleNumber, merges variants, uploads photos via Drive.
"""
import csv
import json
import re
import sys
import time
import urllib.parse
import urllib.request

INPUT_CSV = '/Users/hey.michael/Downloads/furlux-products-cleaned.csv'  # produced by clean step
BASE = 'https://thoughtful-event-3cadde2cc2.strapiapp.com'
TOKEN = 'c550c428dbb15a15a1054147cbae7785a25365c51e0778d1152de1d49acd2eb25a454ceacac24e97911768f3b6dcfabc79472bb5192018e91fd1ea261e9c520c95966c5e18593cceec974eecc1d68b71e9969ef4962e5278812b1fdfa8974045efdbcf84556deb55d8976b512f90fd4869508643b078317dc877e98c66321ebd'

HEADERS = {'Authorization': f'Bearer {TOKEN}', 'Content-Type': 'application/json'}

CATEGORY_MAP = {
    'Сонцезахині': 'iyvwmfoghgggys1wl94b9hyi',
    'Поляризовані': 'wbxbuntx96jco0d2sd1o9lw3',
    'Хамелеон': 'y1gwr20xgwojr7ukzt37tmzm',
    "Комп'ютер/імідж": 'l60opiuwwxzfom3tbun35c12',
}
LENS_MAP = {
    'Сонцезахині': 'сонцезахисні',
    'Поляризовані': 'поляризовані',
    'Хамелеон': 'хамелеон',
    "Комп'ютер/імідж": "комп'ютер",
}
GENDER_MAP = {'Жіночі': 'women', 'Унісекс': 'unisex', 'Чоловічі': 'men'}
FRAME_TYPE_MAP = {'Метал': 'метал', 'Пластик': 'пластик', 'Безоправні': 'безоправні', 'Комбінована': 'комбінована'}
FRAME_SHAPE_MAP = {
    'Авіатор': 'авіатор', 'Багатокутник': 'багатокутник', 'Квадрат': 'квадрат',
    'Круглі': 'круглі', 'Кішка': 'кішка', 'Маска': 'маска', 'Навігатор': 'навігатор',
    'Овал': 'круглі', 'Оверсайз': 'оверсайз', 'Прямокутник': 'прямокутник',
    'Ромб': 'ромби', 'Трапеція': 'трапеція',
}
PHOTO_FORMAT_MAP = {'Catalog': 'catalog', 'Standart': 'standard', 'Legacy': 'legacy'}


# inputs title, does slugify Ukrainian text, returns slug
def slugify(text: str) -> str:
    translit = {'а':'a','б':'b','в':'v','г':'h','ґ':'g','д':'d','е':'e','є':'ye','ж':'zh','з':'z',
                'и':'y','і':'i','ї':'yi','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p',
                'р':'r','с':'s','т':'t','у':'u','ф':'f','х':'kh','ц':'ts','ч':'ch','ш':'sh','щ':'shch',
                'ь':'','ю':'yu','я':'ya',"'":'','"':''}
    out = ''
    for ch in text.lower():
        out += translit.get(ch, ch)
    out = re.sub(r'[^a-z0-9]+', '-', out).strip('-')
    return out or 'product'


# inputs row + index, does parse variant from column/title with multiple strategies, returns {code, label}
def parse_variant(row, index=0):
    raw = (row.get('Варіанти кольорів') or '').strip()
    # Strategy 1: "code:label" or "code^label"
    if raw:
        for sep in (':', '^'):
            if sep in raw:
                code, label = raw.split(sep, 1)
                return {'code': code.strip(), 'label': label.strip().capitalize()}
    # Strategy 2: title has explicit code "Cnumber"
    title = row.get('Товар', '')
    m = re.search(r'\s([CСcс]\d+[\w-]*)\s+(.+?)$', title)
    if m:
        return {'code': m.group(1), 'label': m.group(2).strip().capitalize()}
    # Strategy 3: "Варіанти кольорів" has only label (no code) - generate code
    if raw:
        return {'code': f'V{index + 1}', 'label': raw.strip().capitalize()}
    # Strategy 4: parse color from end of title
    title_clean = re.sub(r'^.*?(?:сонцезахисні|поляризовані|хамелеон|комп\'ютерні|іміджеві|нейлон)\s*', '', title, flags=re.IGNORECASE)
    if title_clean and title_clean != title:
        return {'code': f'V{index + 1}', 'label': title_clean.strip().capitalize()}
    return None


# inputs rows for one article, does build product payload, returns dict
def build_product(rows: list) -> dict:
    first = rows[0]
    article = first['Артикул'].strip()

    # Base title: strip variant suffix
    title = re.sub(r'\s+[CСcс]\d+[\w-]*\s+.+$', '', first['Товар']).strip()
    title = re.sub(r'\s+б/і\s+', ' ', title).strip()

    cat_key = (first.get('Категорія') or '').strip()
    gender_key = (first.get('Стать') or '').strip()
    frame_type_key = (first.get('Матеріал оправи') or '').strip()
    shape_key = (first.get('Форма ') or '').strip()

    # photoFormat: catalog if ANY row marked Catalog (multi-color collection),
    # else standard if any Standart, else legacy
    formats = [(r.get('Формат фото') or '').strip() for r in rows]
    if 'Catalog' in formats or len(rows) > 1:
        photo_format = 'catalog'
    elif 'Standart' in formats:
        photo_format = 'standard'
    else:
        photo_format = 'legacy'

    variants = []
    total_stock = 0
    supplier_codes = []
    for idx, r in enumerate(rows):
        v = parse_variant(r, idx)
        try:
            row_stock = int((r.get('Кільк. загальна') or '0').replace(',', '.').split('.')[0] or '0')
        except Exception:
            row_stock = 0
        total_stock += row_stock
        if v:
            existing = next((x for x in variants if x['code'] == v['code']), None)
            if existing:
                existing['stockQuantity'] = (existing.get('stockQuantity') or 0) + row_stock
            else:
                v['stockQuantity'] = row_stock
                variants.append(v)
        sc = (r.get('Код') or '').strip()
        if sc: supplier_codes.append(sc)

    is_brand = not bool(re.search(r'\bб/і\b', first['Товар'], re.IGNORECASE))

    is_clipon = shape_key == 'Кліпон'
    category_id = CATEGORY_MAP.get(cat_key)
    if is_clipon:
        category_id = 'hw4pys7m5snojc8x3qq6oiw2'

    # Parse price from "Ціна гурт $" (USD wholesale, primary), fallback to "Сума"
    price = 0.0
    for r in rows:
        for col in ('Ціна гурт $', 'Сума'):
            raw_price = (r.get(col) or '').strip().replace(',', '.')
            try:
                p = float(raw_price) if raw_price else 0.0
                if p > 0:
                    price = p
                    break
            except Exception:
                pass
        if price > 0:
            break

    payload = {
        'title': title,
        'slug': f'{slugify(title)}-{slugify(article)}',
        'articleNumber': article,
        'supplierCode': supplier_codes[0] if supplier_codes else None,
        'price': price,
        'currency': 'USD',
        'stockQuantity': total_stock,
        'available': total_stock > 0,
        'isNew': False,
        'isBrand': is_brand,
        'hasClipon': is_clipon,
        'productStatus': 'active' if price > 0 else 'archive',
    }

    if category_id: payload['category'] = category_id
    if gender_key in GENDER_MAP: payload['gender'] = GENDER_MAP[gender_key]
    if frame_type_key in FRAME_TYPE_MAP: payload['frameType'] = FRAME_TYPE_MAP[frame_type_key]
    if shape_key in FRAME_SHAPE_MAP: payload['frameShape'] = FRAME_SHAPE_MAP[shape_key]
    if cat_key in LENS_MAP: payload['lensType'] = LENS_MAP[cat_key]
    payload['photoFormat'] = photo_format
    if variants: payload['variants'] = variants

    return {k: v for k, v in payload.items() if v is not None}


def api_post(path: str, data: dict) -> dict:
    body = json.dumps(data).encode()
    req = urllib.request.Request(f'{BASE}{path}', data=body, method='POST', headers=HEADERS)
    resp = urllib.request.urlopen(req, timeout=120)
    return json.loads(resp.read())


def main():
    with open(INPUT_CSV, encoding='utf-8') as f:
        rows = list(csv.DictReader(f))

    # Group by article
    groups = {}
    for r in rows:
        art = (r.get('Артикул') or '').strip()
        if not art: continue
        groups.setdefault(art, []).append(r)

    print(f'Articles to migrate: {len(groups)}')

    created = 0
    failed = []
    photo_failed = []

    for i, (art, rows_for_art) in enumerate(groups.items(), 1):
        try:
            payload = build_product(rows_for_art)
            print(f'[{i}/{len(groups)}] {art}: {payload["title"][:50]} ({len(payload.get("variants", []))} variants, stock={payload.get("stockQuantity")})')
        except Exception as e:
            print(f'  BUILD FAIL: {e}')
            failed.append({'article': art, 'error': f'build: {e}'})
            continue

        try:
            result = api_post('/api/products', {'data': payload})
            doc_id = result['data']['documentId']
            created += 1
        except urllib.error.HTTPError as e:
            body = e.read().decode()[:200]
            print(f'  CREATE FAIL: {body}')
            failed.append({'article': art, 'error': f'create: {body}'})
            continue
        except Exception as e:
            print(f'  CREATE FAIL: {e}')
            failed.append({'article': art, 'error': f'create: {e}'})
            continue

        # Upload photo
        drive_url = (rows_for_art[0].get('Для Михаила') or '').strip()
        if drive_url:
            try:
                api_post('/api/upload-from-drive', {'url': drive_url, 'productDocumentId': doc_id})
            except urllib.error.HTTPError as e:
                body = e.read().decode()[:200]
                print(f'  PHOTO FAIL: {body}')
                photo_failed.append({'article': art, 'documentId': doc_id, 'url': drive_url, 'error': body})
            except Exception as e:
                print(f'  PHOTO FAIL: {e}')
                photo_failed.append({'article': art, 'documentId': doc_id, 'url': drive_url, 'error': str(e)})

        time.sleep(0.15)  # gentle rate limit

    print(f'\n=== DONE ===')
    print(f'Created: {created}')
    print(f'Failed to create: {len(failed)}')
    print(f'Failed photos: {len(photo_failed)}')

    if failed:
        print('\n--- Create failures ---')
        for f in failed: print(f'  {f["article"]}: {f["error"]}')

    if photo_failed:
        print('\n--- Photo failures ---')
        for f in photo_failed: print(f'  {f["article"]} ({f["documentId"]}): {f["url"][:80]}')

    # Write report
    with open('/Users/hey.michael/Downloads/migration-report.json', 'w', encoding='utf-8') as f:
        json.dump({
            'created': created,
            'total': len(groups),
            'failed': failed,
            'photo_failed': photo_failed,
        }, f, ensure_ascii=False, indent=2)
    print('\nReport: /Users/hey.michael/Downloads/migration-report.json')


if __name__ == '__main__':
    main()
