---
kind: external_dependency
name: Vercel — deployment platform and preview environments
slug: vercel
category: external_dependency
category_hints:
    - vendor_identity
scope:
    - '**'
---

The project is deployed on Vercel; `vercel.json` configures function maxDuration (60s) for all `pages/api/**/*.ts` handlers and disables Prisma migrations/dataproxy at build time. Preview deployments are triggered by pushing branches to the connected Git repository, as demonstrated in the conversation where a branch push auto-builds a preview URL visible in the Vercel dashboard.