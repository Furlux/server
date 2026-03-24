#!/bin/bash
# Seed test orders for dev user (telegramUserId: 99281932)
# Run after Strapi restart and API token permissions are configured

API_URL="http://localhost:1337/api"
TOKEN="431d9bcec005ea2fadee5fc14fde21acc143a89c46b5499258c280adb8025c3e49960d7ae0aa15dc651ae798410045cac30edb876830c65e1984a086e4b74c4cbf7d9244d8d6fdcd312abfd90d57bdee4007a6cee3d3c33a6e82c1f35c774b00690eb8931a584b09d519dd99324e098c9772bb0383056081da876661dc7e09bc"

echo "Creating order 1 (delivered)..."
curl -s -X POST "$API_URL/orders" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "telegramUserId": 99281932,
      "status": "delivered",
      "totalPrice": 3600,
      "currency": "UAH",
      "items": [
        {"id": 1, "productName": "Aviator Classic GS41-X", "quantity": 1, "price": 3600, "imageUrl": null}
      ],
      "firstName": "Dev",
      "lastName": "User",
      "phone": "+380501234567",
      "city": "Київ",
      "deliveryMethod": "nova-poshta-warehouse",
      "warehouseNumber": "5"
    }
  }' | head -c 200
echo ""

echo "Creating order 2 (processing)..."
curl -s -X POST "$API_URL/orders" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "telegramUserId": 99281932,
      "status": "processing",
      "totalPrice": 4200,
      "currency": "UAH",
      "items": [
        {"id": 1, "productName": "Wayfarer Sport", "quantity": 1, "price": 400, "imageUrl": null},
        {"id": 2, "productName": "Transparent Frame", "quantity": 1, "price": 3400, "imageUrl": null},
        {"id": 3, "productName": "Cat Eye Deluxe", "quantity": 1, "price": 400, "imageUrl": null}
      ],
      "firstName": "Dev",
      "lastName": "User",
      "phone": "+380501234567",
      "city": "Львів",
      "deliveryMethod": "nova-poshta-address",
      "streetAddress": "вул. Шевченка, 15, кв. 3"
    }
  }' | head -c 200
echo ""

echo "Done! Check /profile to see orders."
