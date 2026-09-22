---
kind: external_dependency
name: Prisma Accelerate — hosted connection proxy for PostgreSQL
slug: prisma-accelerate
category: external_dependency
category_hints:
    - vendor_identity
    - client_constraint
scope:
    - '**'
---

The `DATABASE_URL` in `.env.example` points to `accelerate.prisma-data.net` with an API key, and `@prisma/extension-accelerate` is installed. This means Prisma connections are routed through Prisma's hosted Accelerate proxy rather than a direct PostgreSQL host, which affects connection pooling, region routing, and credential management.