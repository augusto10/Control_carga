import { PrismaClient } from '../generated/prisma-automation';
import { PrismaPg } from '@prisma/adapter-pg';

const resolverAutomationDatabaseUrl = () => {
  const configured = process.env.AUTOMATION_DATABASE_URL?.trim();
  const isPlaceholder = configured?.includes('@host:') || configured?.includes('@host/');

  if (configured && !isPlaceholder) return configured;

  if (process.env.NODE_ENV !== 'production' && process.env.DIRECT_URL) {
    const url = new URL(process.env.DIRECT_URL);
    url.pathname = '/automation_db';
    return url.toString();
  }

  throw new Error('Configure uma URL válida para o banco de automação.');
};

// Cliente Prisma do BANCO DE AUTOMAÇÃO (AUTOMATION_DATABASE_URL).
// Independente do client padrão em `lib/prisma.ts` (DATABASE_URL).
const automationPrismaClientSingleton = () => {
  if (!process.env.AUTOMATION_DATABASE_URL) {
    throw new Error(
      'AUTOMATION_DATABASE_URL não configurada. Defina a URL do banco de automação nas variáveis de ambiente.'
    );
  }
  const adapter = new PrismaPg({ connectionString: resolverAutomationDatabaseUrl() });
  return new PrismaClient({
    adapter,
    log: ['error', 'warn'],
  });
};

declare global {
  var automationPrisma: undefined | ReturnType<typeof automationPrismaClientSingleton>;
}

const automationPrisma = globalThis.automationPrisma ?? automationPrismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalThis.automationPrisma = automationPrisma;
}

export default automationPrisma;
