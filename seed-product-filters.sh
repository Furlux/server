#!/bin/bash
# Seed new enum fields for existing products
# Run after Strapi restart with updated schema

API_URL="http://localhost:1337/api"
TOKEN="431d9bcec005ea2fadee5fc14fde21acc143a89c46b5499258c280adb8025c3e49960d7ae0aa15dc651ae798410045cac30edb876830c65e1984a086e4b74c4cbf7d9244d8d6fdcd312abfd90d57bdee4007a6cee3d3c33a6e82c1f35c774b00690eb8931a584b09d519dd99324e098c9772bb0383056081da876661dc7e09bc"

update_product() {
  local doc_id=$1
  local data=$2
  echo "Updating $doc_id..."
  curl -s -X PUT "$API_URL/products/$doc_id" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"data\": $data}" | head -c 80
  echo ""
}

# Get all products to find their documentIds
echo "Fetching products..."
PRODUCTS=$(curl -s "$API_URL/products?fields[0]=title&fields[1]=slug&fields[2]=shape&fields[3]=gender&pagination[pageSize]=50" \
  -H "Authorization: Bearer $TOKEN")

echo "$PRODUCTS" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for p in data.get('data', []):
    print(f\"{p['documentId']} | {p['title']} | shape={p.get('shape')} | gender={p.get('gender')}\")
"

echo ""
echo "Now updating products with new enum fields..."

# Map of slug -> {gender, shape, collectionYear, frameMaterial, lensType, lensMaterial}
# We'll update all products by fetching slugs first, then updating by documentId

SLUGS=$(echo "$PRODUCTS" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for p in data.get('data', []):
    print(p['documentId'] + '|' + p['slug'])
")

while IFS='|' read -r doc_id slug; do
  case "$slug" in
    aviator-classic)
      update_product "$doc_id" '{"gender":"men","shape":"aviator","collectionYear":"y2025","frameMaterial":"metal","lensType":"polarized","lensMaterial":"glass"}'
      ;;
    double-bridge-tech)
      update_product "$doc_id" '{"gender":"unisex","shape":"round","collectionYear":"y2026","frameMaterial":"metal","lensType":"gradient","lensMaterial":"mineral"}'
      ;;
    transparent-frame)
      update_product "$doc_id" '{"gender":"women","shape":"round","collectionYear":"y2025","frameMaterial":"acetate","lensType":"gradient","lensMaterial":"mineral"}'
      ;;
    rectangular-slim)
      update_product "$doc_id" '{"gender":"men","shape":"rectangular","collectionYear":"y2025","frameMaterial":"titanium","lensType":"polarized","lensMaterial":"glass"}'
      ;;
    teardrop-aviator)
      update_product "$doc_id" '{"gender":"men","shape":"aviator","collectionYear":"y2026","frameMaterial":"metal","lensType":"polarized","lensMaterial":"glass"}'
      ;;
    flat-top-street)
      update_product "$doc_id" '{"gender":"unisex","shape":"square","collectionYear":"y2025","frameMaterial":"acetate","lensType":"gradient","lensMaterial":"mineral"}'
      ;;
    gradient-dream)
      update_product "$doc_id" '{"gender":"women","shape":"butterfly","collectionYear":"y2026","frameMaterial":"acetate","lensType":"gradient","lensMaterial":"mineral"}'
      ;;
    browline-minimal)
      update_product "$doc_id" '{"gender":"men","shape":"rounded","collectionYear":"y2025","frameMaterial":"acetate","lensType":"polarized","lensMaterial":"glass"}'
      ;;
    d-frame-bold)
      update_product "$doc_id" '{"gender":"unisex","shape":"square","collectionYear":"y2026","frameMaterial":"plastic","lensType":"polarized","lensMaterial":"glass"}'
      ;;
    round-oversized)
      update_product "$doc_id" '{"gender":"women","shape":"round","collectionYear":"y2025","frameMaterial":"metal","lensType":"gradient","lensMaterial":"mineral"}'
      ;;
    rimless-air)
      update_product "$doc_id" '{"gender":"unisex","shape":"non-standard","collectionYear":"y2026","frameMaterial":"titanium","lensType":"polarized","lensMaterial":"glass"}'
      ;;
    sport-flex)
      update_product "$doc_id" '{"gender":"men","shape":"mask","collectionYear":"y2026","frameMaterial":"plastic","lensType":"polarized","lensMaterial":"mineral"}'
      ;;
    hexagon-trend)
      update_product "$doc_id" '{"gender":"unisex","shape":"non-standard","collectionYear":"y2025","frameMaterial":"metal","lensType":"gradient","lensMaterial":"mineral"}'
      ;;
    wayfarer-classic)
      update_product "$doc_id" '{"gender":"unisex","shape":"square","collectionYear":"y2025","frameMaterial":"acetate","lensType":"polarized","lensMaterial":"glass"}'
      ;;
    cat-eye-slim)
      update_product "$doc_id" '{"gender":"women","shape":"cat-eye","collectionYear":"y2026","frameMaterial":"acetate","lensType":"gradient","lensMaterial":"mineral"}'
      ;;
    pilot-titanium)
      update_product "$doc_id" '{"gender":"men","shape":"aviator","collectionYear":"y2026","frameMaterial":"titanium","lensType":"polarized","lensMaterial":"glass"}'
      ;;
    oval-classic)
      update_product "$doc_id" '{"gender":"women","shape":"oval","collectionYear":"y2025","frameMaterial":"metal","lensType":"gradient","lensMaterial":"mineral"}'
      ;;
    round-vintage)
      update_product "$doc_id" '{"gender":"unisex","shape":"round","collectionYear":"y2025","frameMaterial":"metal","lensType":"gradient","lensMaterial":"glass"}'
      ;;
    square-modern)
      update_product "$doc_id" '{"gender":"men","shape":"square","collectionYear":"y2026","frameMaterial":"plastic","lensType":"polarized","lensMaterial":"mineral"}'
      ;;
    panto-retro|*)
      update_product "$doc_id" '{"gender":"unisex","shape":"panto","collectionYear":"y2025","frameMaterial":"acetate","lensType":"gradient","lensMaterial":"mineral"}'
      ;;
  esac
done <<< "$SLUGS"

echo ""
echo "Done! All products updated with new filter fields."
