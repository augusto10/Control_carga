---
kind: error_handling
name: Next.js API Error Handling with Typed Responses and Auth Middleware
category: error_handling
scope:
    - '**'
source_files:
    - middleware.ts
    - middleware/auth.ts
    - lib/middleware/withAuth.ts
    - pages/api/auth/login.ts
    - pages/api/admin/dashboard.ts
    - types/api.ts
    - types/auth-types.ts
    - prisma/config.ts
---

## Overview

This Next.js logistics platform uses a pragmatic, per-route error handling strategy centered on `res.status().json()` responses rather than a centralized exception framework. Errors are caught inline in each API handler, logged via `console.error`, and returned as typed JSON payloads. Authentication and authorization errors are handled by reusable middleware wrappers.

## Core Patterns

### 1. Typed Error Response Shapes

Two parallel type definitions describe the error contract:
- `types/api.ts` defines `ApiError { message; error? }` and a generic `ApiResponse<T> { data?; error?; success }` used across client-facing APIs.
- `prisma/config.ts` redefines `ApiError = { code; message; details? }` and `ApiResponse<T>` for server-side Prisma-related types, showing a slight divergence between client and server response shapes.
- `types/auth-types.ts` defines `AuthError { code; message; details? }` for authentication-specific failures.

These interfaces are not enforced at runtime — they guide how handlers structure their responses.

### 2. Per-Route Try/Catch Wrapping

Most API handlers wrap their logic in try/catch blocks that return structured error responses. For example, `pages/api/auth/login.ts` catches database errors, password comparison errors, JWT signing errors, and unknown errors, each returning `{ success: false, message, code?, error? }` with status codes 400/401/403/500. The catch block also conditionally includes the raw error message only when `NODE_ENV === 'development'`, hiding internals in production.

Simpler routes like `pages/api/admin/dashboard.ts` use a single try/catch that logs the error and returns `{ message: 'Erro interno do servidor' }` with status 500.

### 3. Authentication & Authorization Middleware

Two auth middleware implementations exist (one in `middleware/auth.ts`, another in `lib/middleware/withAuth.ts`) that wrap route handlers to enforce JWT-based authentication:
- They extract the token from either the `Authorization: Bearer <token>` header or an `auth_token` cookie.
- On missing/invalid tokens they return `res.status(401).json({ success: false, message: '...' })`.
- Role-based guards (`requireRole`, `requireAdmin`, `requireUser`) compose around `withAuth` to restrict access by user type.
- Invalid JWTs, expired tokens, and inactive users all map to 401 responses with descriptive messages.

The `middleware/auth.ts` version additionally verifies the user exists and is active in the database before attaching `req.user` to the request.

### 4. Global CORS Middleware

`middleware.ts` is a Next.js Edge middleware that runs on `/api/:path*`. It does not handle application errors but centralizes security headers (CORS, CSP, HSTS) and cookie processing. Errors during origin/domain parsing are caught and logged via `console.error`, then treated conservatively (e.g., allowing the request in development).

### 5. Client-Side Error Types

On the frontend, `types/auth-types.ts` defines an `AuthState` with an `error: string | null` field, indicating that UI components track and display authentication errors as plain strings rather than structured objects.

## Conventions Observed

- **No custom error classes**: The codebase does not define domain-specific error classes (no `extends Error`). Errors are represented as plain objects with `message` and optional `code`/`details` fields.
- **Status-code-driven responses**: HTTP status codes (400, 401, 403, 405, 500) are the primary signal of failure, paired with a JSON body containing `success: false` and a human-readable `message`.
- **Structured error codes**: Many handlers include a machine-readable `code` field (e.g., `INVALID_CREDENTIALS`, `DATABASE_ERROR`, `TOKEN_GENERATION_ERROR`, `INTERNAL_SERVER_ERROR`) enabling clients to branch on specific failure modes.
- **Development-only stack traces**: Sensitive error details are included in responses only when `process.env.NODE_ENV === 'development'`.
- **Centralized logging**: All errors are logged through `console.error` before being returned — there is no structured logger or log-level configuration.
- **No global error boundary for API routes**: There is no top-level error handler that intercepts unhandled exceptions in API routes; each route must explicitly catch and respond.
- **Middleware short-circuits**: Auth middleware returns early on failure without invoking the wrapped handler, preventing downstream code from executing with invalid context.

## Key Files

- `middleware.ts` — Global Next.js Edge middleware for CORS/security headers
- `middleware/auth.ts` — JWT-based auth wrapper with role guards
- `lib/middleware/withAuth.ts` — Alternative cookie-based auth wrapper
- `pages/api/auth/login.ts` — Example of comprehensive per-step error handling
- `pages/api/admin/dashboard.ts` — Minimal error handling pattern
- `types/api.ts` — Shared `ApiError` / `ApiResponse` types
- `types/auth-types.ts` — `AuthError` and auth state types
- `prisma/config.ts` — Server-side `ApiError` / `ApiResponse` types

## Constraints

- No `throw new Error(...)` propagation into a global handler exists; every async operation is individually wrapped in try/catch within its route.
- There is no `@next/error` or custom `_error` page configured for API routes — errors are always returned as JSON responses.
- The two different `ApiError` definitions (`types/api.ts` vs `prisma/config.ts`) indicate inconsistent error shape conventions between client and server layers.