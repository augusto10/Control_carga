---
kind: configuration_system
name: Configuration System — Environment Variables, Runtime Feature Flags & Admin-Editable Settings
category: configuration_system
scope:
    - '**'
source_files:
    - .env.example
    - next.config.js
    - netlify.toml
    - middleware.ts
    - lib/prisma.ts
    - lib/supabase.ts
    - prisma/config.ts
    - pages/api/admin/configuracoes/index.ts
    - pages/api/admin/configuracoes/[chave].ts
    - hooks/useConfiguracoes.ts
    - contexts/ConfiguracaoContext.tsx
    - config/adminRoutes.ts
---

## Overview

The application uses a layered configuration system that combines three distinct mechanisms:

1. **Static environment variables** (`.env`, `.env.example`, Next.js `NEXT_PUBLIC_*` and server-only vars) for runtime secrets and service endpoints.
2. **Build/deploy-time configuration** via `next.config.js`, `netlify.toml`, `vercel.json`, and `prisma/config.ts`.
3. **Runtime feature flags stored in the database** (`configuracaoSistema` table), exposed through an admin API and consumed via React Context/hook on the client.

There is no centralized config loader library; instead, each subsystem reads its own `process.env` keys directly.

## Static Environment Variables

All required and optional environment variables are documented in `.env.example` (112 lines). They fall into these groups:

| Group | Keys | Purpose |
|---|---|---|
| Database | `DATABASE_URL`, `PRISMA_GENERATE_DATAPROXY`, `PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK` | Prisma/PostgreSQL connection and Neon-specific flags |
| Auth | `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `JWT_SECRET` | NextAuth session signing and JWT verification |
| Frontend URLs | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client-visible base URLs |
| External ERP / logistics APIs | `API_EXTERNA_BASE_URL`, `API_EXTERNA_USERNAME`, `API_EXTERNA_PASSWORD`, `ERP_API_URL`, `ERP_API_USERNAME`, `ERP_API_PASSWORD`, `ERP_EMPRESA_ID`, `ERP_AUTOMATION_ENABLED`, plus dozens of `ERP_*` UI automation coordinates and timeouts | Integration with the external ERP and logistics backends |
| Platform | `CRON_SECRET`, `VERCEL_URL`, `NODE_ENV` | Deployment platform signals |

Environment variable access patterns observed across the codebase:
- Server-side modules read secrets directly from `process.env` (e.g. `lib/supabase.ts`, `middleware.ts`, `lib/server-auth.ts`, `lib/middleware/withAuth.ts`).
- Client-facing URLs use the `NEXT_PUBLIC_` prefix so they are baked into the browser bundle by Next.js.
- The middleware at `middleware.ts` uses `process.env.NODE_ENV === 'production'` to toggle CORS strictness, HSTS headers, and cookie `Secure`/`SameSite=None` behavior.
- `next.config.js` sets build-time flags (`reactStrictMode: false`, `swcMinify: true`, `ignoreBuildErrors: true`) and webpack fallbacks (`fs`, `net`, `tls` disabled on the client).

## Deploy-Time Configuration

- `netlify.toml` declares the build command, publish directory (`.next`), and overrides `NEXT_PUBLIC_API_URL` at deploy time under `[build.environment]`.
- `vercel.json` exists alongside `next.config.js` for Vercel-specific settings.
- `prisma/config.ts` defines typed shapes (`ConfiguracaoSistema`, `ConfiguracaoSistemaInput`, `ApiResponse<T>`) used by the runtime configuration API, but the actual Prisma client instance lives in `lib/prisma.ts`, which creates a singleton `PrismaClient` with `log: ['query', 'error', 'warn']` and reuses it across requests in non-production.

## Runtime Feature Flags (Database-Stored Configurations)

The application supports dynamic, user-editable feature flags persisted in PostgreSQL under the `configuracaoSistema` table. The flow is:

1. **Admin API** (`pages/api/admin/configuracoes/index.ts`):
   - `GET /api/admin/configuracoes` returns all rows where `editavel: true`, selecting `id`, `chave`, `valor`, `descricao`, `tipo`, `opcoes`, `editavel`, ordered by `chave`.
   - `PUT /api/admin/configuracoes` accepts an array of `{ id, valor }` and updates them inside a single Prisma `$transaction`.
   - `POST /api/admin/configuracoes` upserts a single key-value pair by `chave`.
   - `PUT /api/admin/configuracoes/[chave]` (`[chave].ts`) updates one row by its unique `chave`.

2. **Client hook** (`hooks/useConfiguracoes.ts`):
   - Calls `api.get('/api/admin/configuracoes')` and casts each row's `valor` to its declared `tipo` (`string`, `number`, `boolean`, `json`).
   - Caches results in local React state keyed by `chave`.
   - Handles 403 gracefully (non-admin users get an empty config map without surfacing an error).
   - Exposes `carregarConfiguracoes`, `atualizarConfiguracoes(chave, valor)`, and `getConfiguracao(chave, default)`.

3. **React Context** (`contexts/ConfiguracaoContext.tsx`):
   - Wraps the app in `ConfiguracaoProvider`, which triggers `carregarConfiguracoes()` only when `isAuthenticated` is true.
   - Provides `getConfig(key, defaultValue)` and `atualizarConfigs(map)` for components.
   - Exposes a typed `useConfig<T>(key, defaultValue)` hook returning `{ valor, loading, error, atualizar }`.

4. **Admin UI**: The route `/admin/configuracoes` (listed in `config/adminRoutes.ts` under `ADMIN_ROUTES` with role `USER_TYPES.ADMIN`) renders the management interface backed by this context.

## Conventions and Constraints

- **Secrets never leave the server**: Only `NEXT_PUBLIC_*` variables are exposed to the browser; all other env vars (database URL, JWT secret, ERP credentials) are read exclusively in server-side files (`lib/`, `pages/api/*`, `middleware.ts`).
- **Feature flags are opt-in**: Only rows marked `editavel: true` are returned by the admin API, so new flags must be explicitly enabled before being surfaced to clients.
- **Type coercion happens on the client**: The `useConfiguracoes` hook converts string values from the DB into native JS types based on the `tipo` field (`parseFloat`, `=== 'true'`, `JSON.parse`), so consumers receive typed values rather than raw strings.
- **Updates are transactional**: Bulk updates via `PUT /api/admin/configuracoes` wrap all row updates in `prisma.$transaction`, ensuring atomicity.
- **Non-admin access is silent**: A 403 response from the config API is treated as "no permissions" and yields an empty config object rather than throwing, preventing unauthenticated users from seeing errors.
- **CORS and cookies are environment-aware**: The global `middleware.ts` enforces different allowed origins, domains, and cookie attributes depending on `NODE_ENV`, with production additionally setting `Strict-Transport-Security`.
- **Admin routes are declarative**: Route metadata (path, title, icon, roles) is defined centrally in `config/adminRoutes.ts` and filtered by role via `userHasAccess` / `getAdminRoutes`.