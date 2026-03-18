# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **Mobile app**: Expo (React Native) — `artifacts/financial-hub`
- **Build**: esbuild (CJS bundle for API), Expo Metro (mobile)

## Financial Hub App

Full-stack Italian financial tracking mobile app. Pages:
- **Principale** — dashboard with patrimony card, expense summary, institution balances
- **Spese** — 3-tab expense tracker (Ordinarie, Movimenti, Finanziarie) with delete support
- **Investimenti** — portfolio cards with P&L, type allocation
- **Statistiche** — bar charts for monthly/category/portfolio stats
- **Indici** — hidden page (accessible via activity icon from Principale/Impostazioni) for asset prices & interest rates
- **Impostazioni** — configuration for institutions, categories (with subcategories), instruments

### Key Design Decisions
- Language: Italian throughout
- Primary color: #0A84FF (iOS blue), green: #30D158, red: #FF453A
- `acquisto` = uscita (money out), `vendita` = entrata (money in)
- Custom API client at `artifacts/financial-hub/lib/api.ts`
- Stats computed server-side in `artifacts/api-server/src/routes/stats.ts`
- Instrument types: ETF, Azione, Crypto, Obbligazione, Altro
- Institution types: bank, broker, crypto, other

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server (port 8080)
│   └── financial-hub/      # Expo React Native app
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## DB Schema (all tables in public schema)

- `institutions` — banche, broker, crypto exchange
- `categories` — categorie spese
- `subcategories` — sottocategorie (FK → categories)
- `instruments` — strumenti finanziari (ETF, azioni, ecc.)
- `ordinary_expenses` — spese ordinarie (acquisto/vendita)
- `transfers` — movimenti tra istituti
- `financial_transactions` — transazioni acquisto/vendita strumenti
- `asset_prices` — prezzi storici strumenti
- `interest_rates` — tassi interesse per istituto

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

- **Always typecheck from the root** — run `pnpm run typecheck`
- **`emitDeclarationOnly`** — only `.d.ts` files during typecheck
- **Project references** — cross-package imports require `references` array

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly`

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server on port 8080. Routes:
- `/api/institutions`, `/api/categories`, `/api/subcategories`, `/api/instruments`
- `/api/expenses`, `/api/transfers`, `/api/financial-transactions`
- `/api/asset-prices`, `/api/interest-rates`
- `/api/stats/portfolio`, `/api/stats/expenses-by-category`, `/api/stats/monthly-expenses`, `/api/stats/institution-balances`, `/api/stats/summary`

### `artifacts/financial-hub` (`@workspace/financial-hub`)

Expo React Native app. Key files:
- `app/(tabs)/` — all tab screens
- `app/modal/` — add-expense, add-transfer, add-financial modals
- `app/indici.tsx` — asset prices & interest rates page
- `lib/api.ts` — custom API client (all types + fetch wrappers)
- `hooks/useTheme.ts` — dark/light theme hook
- `constants/colors.ts` — color palette
- `components/ui/` — Card, EmptyState, MoneyText, SectionHeader

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL.

Production migrations handled by Replit when publishing. In development: `pnpm --filter @workspace/db run push` or `push-force`.
