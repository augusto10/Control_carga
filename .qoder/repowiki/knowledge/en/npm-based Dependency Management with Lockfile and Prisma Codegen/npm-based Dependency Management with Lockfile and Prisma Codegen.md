---
kind: dependency_management
name: npm-based Dependency Management with Lockfile and Prisma Codegen
category: dependency_management
scope:
    - '**'
source_files:
    - package.json
    - package-lock.json
    - .nvmrc
    - next.config.js
    - tsconfig.json
---

## System / Approach

This Next.js 14 application manages third-party dependencies through **npm** (Node Package Manager) using a standard `package.json` manifest plus a committed `package-lock.json` lockfile. The project declares both runtime `dependencies` and `devDependencies`, pins Node.js version via `.nvmrc` (`22`) and the `engines.node` field in `package.json`, and uses a `postinstall` hook to run `prisma generate` so the Prisma client is always regenerated after install.

There is **no vendoring** of npm packages — all packages are resolved from the public npm registry (as evidenced by the `resolved: https://registry.npmjs.org/...` entries in `package-lock.json`). There is no `.npmrc` file, no private registry configuration, no `NPM_TOKEN` or `NPM_REGISTRY` references in the repository, and no `pnpm-lock.yaml` / `yarn.lock` / `bun.lock` files, confirming npm as the sole package manager.

## Key Files

- `package.json` — central manifest declaring all runtime and dev dependencies, scripts, and the `engines.node = "22.x"` constraint.
- `package-lock.json` — deterministic lockfile (lockfileVersion 3) that pins every transitive dependency to an exact version and integrity hash; this is the source of truth for reproducible installs.
- `.nvmrc` — declares Node.js major version `22` for consistent tooling across environments.
- `next.config.js` — configures how certain dependencies are bundled (e.g., `transpilePackages: ['react-leaflet', 'leaflet-routing-machine']`, `experimental.serverComponentsExternalPackages: ['@prisma/client', 'prisma']`, webpack fallbacks for `fs/net/tls` on the client).
- `tsconfig.json` — sets module resolution to `node` and includes path aliases (`@/*`, `@/contexts/*`, `@/services/*`, etc.) that affect how TypeScript resolves local imports but does not alter npm resolution.
- `scripts/sync-label-products.mjs` and other scripts under `scripts/` — use `ts-node` and `dotenv-cli` to run ad-hoc maintenance tasks against the same dependency graph.
- `netlify.toml` and `.vercelignore` — deployment configs that influence which dependencies are shipped to Netlify/Vercel build environments.

## Architecture and Conventions

- **Semver ranges**: All dependencies use caret (`^`) ranges (e.g., `"next": "^14.2.29"`, `"@mui/material": "^5.17.1"`, `"zod": "^4.0.5"`), allowing minor/patch updates while blocking breaking changes. One exception is `date-fns` pinned to an exact patch `"2.30.0"`.
- **Lockfile-first**: `package-lock.json` is committed alongside `package.json`, ensuring CI and production builds resolve the exact same tree regardless of when they run.
- **Postinstall codegen**: The `postinstall: prisma generate` script guarantees the Prisma client types are regenerated on every `npm install`, keeping `@prisma/client` in sync with `schema.prisma`.
- **Build-time vs runtime split**: Heavy libraries like `@prisma/client`, `prisma`, `pg`, `multer`, `formidable`, `exceljs`, `xlsx`, `pdf-lib`, `sharp`, `qz-tray`, `bcryptjs`, `jsonwebtoken`, `axios`, `chart.js`, `framer-motion`, `leaflet`, `react-leaflet`, `@emotion/*`, `@mui/*`, `zustand`, `notistack`, `react-hook-form`, `signature_pad`, `react-signature-canvas`, `react-input-mask`, `react-number-format`, `react-redux`, `cookies-next`, `nookies`, `cookie`, `bufferutil`, `utf-8-validate`, `autoprefixer`, `postcss`, `tailwindcss`, `@tailwindcss/postcss`, `clsx`, `tailwind-merge`, `lucide-react`, `jsbarcode`, `@zxing/*`, `node-fetch`, `date-fns`, `dotenv-cli` are declared as runtime dependencies because they are imported directly from pages, API routes, server-side scripts, and components.
- **Dev-only tooling**: `typescript`, `eslint`, `eslint-config-next`, `prisma` (CLI), `ts-node`, `tsconfig-paths`, `@types/*` packages, and `dotenv` are isolated under `devDependencies` so they are not shipped to production.
- **Prisma dual-versioning**: Both `@prisma/client` (`^6.19.0`) and `@prisma/engines` (`^7.0.1`) are explicitly pinned, along with the `prisma` CLI (`^6.12.0`), reflecting the need to keep the generated client, engine binaries, and migration tool aligned.
- **Next.js-specific bundling rules**: `next.config.js` forces transpilation of `react-leaflet` and `leaflet-routing-machine` (which ship ESM/CJS that Next's bundler needs help with) and marks `@prisma/client` and `prisma` as external server-only packages so they are not included in the client bundle.

## Conventions and Constraints

- **Node version pinning**: The project constrains the runtime to Node.js 22.x via both `.nvmrc` and `package.json` `engines.node`. This is enforced at install time by npm/yarn/pnpm if the `engines` field is respected by the installer.
- **Deterministic installs**: Because `package-lock.json` is committed, any fresh clone must produce the same dependency tree; changing versions requires updating both `package.json` and committing the regenerated lockfile.
- **No private registries or vendoring**: No `.npmrc`, no `--registry` flags, no `vendor/` directory, no `resolutions`/`overrides` fields — all packages come from the public npm registry.
- **Scripts gate critical steps**: The `build` script runs `prisma generate && next build`, and `lint`/`type-check` scripts wrap failures with `|| node -e "process.exit(0)"` to avoid failing CI pipelines on non-critical issues.
- **Deployment isolation**: `netlify.toml` and `.vercelignore` control which files/packages are included in deployments, separate from the local `node_modules` tree.