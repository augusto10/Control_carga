---
kind: build_system
name: Next.js + Prisma Build, Deployment & CI Pipeline for a Vercel/Netlify-Hosted Logistics App
category: build_system
scope:
    - '**'
source_files:
    - package.json
    - next.config.js
    - vercel.json
    - netlify.toml
    - .github/workflows/sync-label-products.yml
    - scripts/build-production.js
    - scripts/vercel-postbuild.js
    - scripts/executar-migration-producao.ts
    - scripts/sync-label-products.mjs
    - prisma/schema.prisma
    - tsconfig.json
---

## Build System Overview

The project is a Next.js 14 application (Node 22) that builds to a static/bundled output and deploys primarily to **Vercel** and secondarily to **Netlify**. There is no Dockerfile or Makefile; the build pipeline is driven by `package.json` scripts, `next.config.js`, `vercel.json`, `netlify.toml`, and a single GitHub Actions workflow.

### Core Build Steps

1. **Dependency install**: `npm ci` (CI) / `npm install` (local), which triggers `postinstall: prisma generate` to produce the typed Prisma client from `prisma/schema.prisma`.
2. **Prisma client generation**: Explicitly run before every build via `build: prisma generate && next build`. A standalone `scripts/build-production.js` also runs `npx prisma generate` with `PRISMA_GENERATE_DATAPROXY=false` and `PRISMA_SKIP_POSTINSTALL_GENERATE=false`.
3. **Next.js production build**: `next build` produces the `.next` artifact. The build intentionally **ignores TypeScript errors and ESLint failures** (`typescript.ignoreBuildErrors: true`, `eslint.ignoreDuringBuilds: true`) in both `next.config.js` and `scripts/build-production.js`, so type drift does not block deployments.
4. **Output**: `.next` directory — consumed by `next start` locally and published as the deploy artifact on Vercel/Netlify.
5. **Runtime**: `next start` serves the built app; serverless functions under `pages/api/**` are deployed as Vercel/Netlify Edge or Node functions with a 60-second max duration per `vercel.json`.

### Environment & Configuration

- **Node version**: pinned via `engines.node = "22.x"` and `.nvmrc`; CI uses `actions/setup-node@v4` with `node-version: 22`.
- **TypeScript**: strict mode enabled, `noEmit: true`, path aliases `@/*`, `@/contexts/*`, `@/services/*`, `@/types/*`, `@/components/*`, `@/lib/*` resolved at compile time. `tsconfig.etiquetas.json` exists for a separate label-build target used by CI validation.
- **Next config**: disables React Strict Mode, enables SWC minification, transpiles `react-leaflet` and `leaflet-routing-machine`, marks `@prisma/client` and `prisma` as external server components, and strips Node-only modules (`fs`, `net`, `tls`) from the browser bundle.
- **Vercel-specific**: `vercel.json` sets `PRISMA_GENERATE_DATAPROXY=false` and `PRISMA_SKIP_MIGRATIONS=true`, meaning migrations are **not** auto-run during deployment.
- **Netlify-specific**: `netlify.toml` sets `command = npm run build`, `publish = .next`, injects `NEXT_PUBLIC_API_URL=https://api.controle-carga.com`, and rewrites `/api/*` to 200 (proxying API routes).

### Database Migrations & Data Layer

- Schema lives in `prisma/schema.prisma` (PostgreSQL provider, binary targets `native` and `debian-openssl-3.0.x`).
- Migrations are stored as timestamped directories under `prisma/migrations/` plus legacy `.sql` files under `prisma/migrations/` and top-level `sql/`.
- **No automated migration step** runs during build or deploy. `vercel.json` explicitly skips migrations, and `scripts/vercel-postbuild.js` only validates DB connectivity (counting `Motorista`, `ControleCarga`, `NotaFiscal`) and prints a message directing operators to execute migrations manually (see `EXECUTAR_MIGRATION_MANUAL.md`).
- Production migration is executed via the dedicated script `scripts/executar-migration-producao.ts`, which reads `migration-producao-segura.sql`, splits it into statements, and executes them through `prisma.$executeRawUnsafe` / `$queryRawUnsafe` against `DATABASE_URL`.
- Seed data lives in `prisma/seed.ts` and `prisma/seed.sql`; ad-hoc seed/fix scripts live under `scripts/` (e.g., `create-admin.ts`, `populate-pessoas-completo.js`, `migrar-banco-producao.js`).

### CI / Automation

Only one GitHub Actions workflow exists: `.github/workflows/sync-label-products.yml`.

- **Trigger**: cron `17 5 */3 * *` (every 3 days at 05:17 UTC) or manual `workflow_dispatch`.
- **Job**: checks out the repo, installs deps with `npm ci`, runs `npm run sync:label-products` (a Node script that pulls product catalog/photos from an ERP API and writes `src/data/products-maxima.json` and `public/products/erp/**`), then validates types with `tsc --noEmit -p tsconfig.etiquetas.json`.
- **Publish**: if the sync changes any files, the workflow commits and pushes back to the same branch using a dedicated bot identity (`Etiquetas ERP Bot`). Concurrency is grouped under `sync-label-products` with `cancel-in-progress: false`.

There is **no CI build/test/lint pipeline** for the main application code — lint and type-check are local/dev-time only.

### Scripts Inventory

| Script | Purpose |
|---|---|
| `dev` | Start Next dev server |
| `build` | Generate Prisma client + Next production build |
| `start` | Serve built Next app |
| `lint` | Run Next lint with `--fix`, swallow non-zero exit |
| `type-check` | `tsc --noEmit`, swallow non-zero exit |
| `test:labels` | Run label tests via `ts-node` |
| `sync:label-products` / `sync:label-products-full` | Sync product catalog & photos from ERP |
| `migration:logistica-snapshot` | Apply logistics snapshot migration helper |
| `correcao-temporaria` / `reverter-correcao-temporaria` | Apply/revert temporary hotfixes |
| `migration-producao` | Execute `executar-migration-producao.ts` against production DB |
| Standalone `scripts/build-production.js` | Full production build wrapper that temporarily forces TS/ESLint ignore flags |
| Standalone `scripts/vercel-postbuild.js` | Post-deploy DB connectivity probe (non-fatal) |

### Key Conventions & Constraints

- **Build never fails on type/ESLint issues** — this is enforced by `next.config.js` and mirrored in `scripts/build-production.js`; deployments can proceed even with type errors.
- **Migrations are manual** — `PRISMA_SKIP_MIGRATIONS=true` on Vercel and the postbuild script explicitly instructs operators to run migrations manually; there is no `prisma migrate deploy` in any build step.
- **Node 22 is required** across dev, build, and CI.
- **Prisma client is generated twice**: once via `postinstall` and again explicitly in `build` and `scripts/build-production.js`.
- **Server components externalize Prisma** — `@prisma/client` and `prisma` are listed in `experimental.serverComponentsExternalPackages`, allowing Prisma to be used in Next Server Components without bundling.
- **Label product sync is the only automated CI task**, running on a schedule and self-publishing its own changes.
- **Environment variables** are injected per platform: Vercel via `vercel.json` env block, Netlify via `netlify.toml` `[build.environment]`, and runtime secrets via GitHub Actions `secrets.*` / `vars.*`.