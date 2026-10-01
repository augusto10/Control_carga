---
kind: external_dependency
name: Supabase — client SDK for auth / realtime features
slug: supabase
category: external_dependency
category_hints:
    - vendor_identity
scope:
    - '**'
---

`@supabase/supabase-js` is initialized via `createClient` using `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. The client is exported from `lib/supabase.ts` and consumed elsewhere for Supabase-backed features alongside Prisma/PostgreSQL.