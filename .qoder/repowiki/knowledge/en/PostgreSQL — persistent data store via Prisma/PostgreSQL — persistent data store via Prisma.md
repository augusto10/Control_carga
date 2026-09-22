---
kind: external_dependency
name: PostgreSQL — persistent data store via Prisma
slug: postgresql
category: external_dependency
category_hints:
    - vendor_identity
scope:
    - '**'
---

PostgreSQL is the backing database for Prisma models. Connection is configured through `DATABASE_URL` (pointing to Prisma Accelerate in the example env). The README lists it as a requirement and the project ships many SQL migration/seed scripts under `scripts/` and `sql/`.