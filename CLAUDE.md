# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Furlux Server is a **Strapi v5** headless CMS backend for an eyewear (Furlux) brand with Telegram Web App integration. It provides REST APIs for products, categories, pages (dynamic page builder), and global site settings.

## Commands

```bash
yarn dev          # Start development server with hot reload (port 1337)
yarn build        # Build admin panel for production
yarn start        # Start production server
yarn deploy       # Deploy to Strapi Cloud
```

No test runner is configured. No linter config exists.

## Architecture

### Content Types (src/api/)

- **product** — Collection type. Fields: title, slug, price, currency, description (rich text), images, category relation, product attributes (brand, color, lensType, uvProtection, gender, shape), available/isNew flags, JSON `attributes` for dynamic specs.
- **category** — Collection type with self-referencing hierarchy (parent/children). Fields: name, slug, icon, order, products relation.
- **page** — Collection type with dynamic zone `blocks` for composable page building. Available block components: hero, text-block, image-block, collection-preview, faq, cta.
- **global** — Single type for site-wide settings (theme, siteName, sitePhone, siteDescription, logo component).

All API endpoints use Strapi core factory controllers/services/routes — no custom endpoints.

### Custom Middleware

`src/middlewares/telegram-auth.ts` — Validates Telegram Web App `initData` via HMAC-SHA256. Supports public route bypass configuration. Currently **disabled** in `config/middlewares.ts`.

### Configuration

- `config/database.ts` — Supports SQLite (default, `.tmp/data.db`), MySQL, and PostgreSQL via `DATABASE_CLIENT` env var.
- `config/api.ts` — REST defaults: `defaultLimit: 25`, `maxLimit: 100`, `withCount: true`.
- `config/middlewares.ts` — Middleware stack ordering including telegram-auth slot.

### Key Environment Variables

```
HOST, PORT, APP_KEYS, ADMIN_JWT_SECRET, API_TOKEN_SALT, JWT_SECRET
TRANSFER_TOKEN_SALT, ENCRYPTION_KEY
TG_BOT_TOKEN          # Required for Telegram auth middleware
DATABASE_CLIENT        # sqlite, mysql, postgres
DATABASE_HOST/PORT/NAME/USERNAME/PASSWORD  # For MySQL/PostgreSQL
```

### Generated Files

`types/generated/` contains auto-generated TypeScript definitions from content-type schemas — do not edit manually.

## Tech Stack

- **Strapi v5.34.0** with TypeScript
- **Node.js** >=20.0.0
- **Package manager**: Yarn
- **Database**: SQLite by default (configurable)
- **Auth**: JWT (built-in) + Telegram Web App validation (custom)
