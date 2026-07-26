# Architecture

Coming soon.

## Overview

EZCommerse is a multi-tenant restaurant operations platform:

- **`be/`** — NestJS + TypeORM + PostgreSQL API (`/api` prefix)
- **`webFe/`** — Next.js web client
- **Mobile companion** — Expo / React Native app in a sibling repository (`business-app`)
- **Auth** — JWT access + refresh tokens; organization and outlet scoping via middleware/headers

## Request flow (simplified)

```text
Browser / Mobile
    │
    ▼
webFe (Next.js)  ──Bearer JWT + X-Outlet-Id──►  be (NestJS)
                                                    │
                                                    ▼
                                               PostgreSQL
```

## Key domain areas

- Organizations, users, invites, outlets
- Products, categories, recipes, stock / inventory
- Sales / tables / invoices
- Expenses, CRM, dashboard, reports, settings

Detailed module diagrams and ERDs will be added here.
