import { PrismaClient } from '@prisma/client';

// Script-only Prisma Client (sem Accelerate/Data Proxy)
// Usa DIRECT_URL se disponível, senão DATABASE_URL
// Requer URL direta do Postgres (postgres:// ou prisma+postgres://)

const datasourceUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!datasourceUrl) {
  throw new Error('[prismaScriptClient] Nenhuma URL de banco encontrada. Defina DIRECT_URL ou DATABASE_URL.');
}

export const prismaScript = new PrismaClient({
  datasourceUrl,
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error', 'warn'],
});
