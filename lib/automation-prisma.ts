import { PrismaClient } from '../generated/prisma-automation';

// Cliente Prisma do BANCO DE AUTOMAÇÃO (AUTOMATION_DATABASE_URL).
// Independente do client padrão em `lib/prisma.ts` (DATABASE_URL).
const automationPrismaClientSingleton = () => {
  if (!process.env.AUTOMATION_DATABASE_URL) {
    throw new Error(
      'AUTOMATION_DATABASE_URL não configurada. Defina a URL do banco de automação nas variáveis de ambiente.'
    );
  }
  return new PrismaClient({
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
