#!/usr/bin/env python3
"""
inputs production API, does set available=true + currency=USD for all products, returns stats
"""

import json
import urllib.request
import urllib.error
import time

API_BASE = "https://thoughtful-event-3cadde2cc2.strapiapp.com/api"
API_TOKEN = "c550c428dbb15a15a1054147cbae7785a25365c51e0778d1152de1d49acd2eb25a454ceacac24e97911768f3b6dcfabc79472bb5192018e91fd1ea261e9c520c95966c5e18593cceec974eecc1d68b71e9969ef4962e5278812b1fdfa8974045efdbcf84556deb55d8976b512f90fd4869508643b078317dc877e98c66321ebd"

HEADERS = {
    "Authorization": f"Bearer {API_TOKEN}",
    "Content-Type": "application/json",
}


def api_request(method: str, endpoint: str, data=None) -> dict:
    """inputs method + endpoint + optional data, does API request, returns response dict"""
    url = f"{API_BASE}/{endpoint}"
    body = json.dumps({"data": data}).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=body, headers=HEADERS, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        print(f"  ERROR {e.code}: {e.read().decode()[:200]}")
        return {}


# Fetch all products
print("Fetching all products...")
resp = api_request("GET", "products?pagination[pageSize]=100&fields[0]=documentId&fields[1]=title&fields[2]=available&fields[3]=currency")
products = resp.get("data", [])
print(f"Found {len(products)} products")

updated = 0
failed = 0

for product in products:
    doc_id = product["documentId"]
    title = product.get("title", "?")

    result = api_request("PUT", f"products/{doc_id}", {
        "available": True,
        "currency": "USD",
    })

    if result.get("data"):
        print(f"  OK  {title}")
        updated += 1
    else:
        print(f"  FAIL {title}")
        failed += 1

    time.sleep(0.1)

print(f"\nUpdated: {updated}, Failed: {failed}")
