import { PrismaClient, Prisma } from '@prisma/client';

// Log para depuração
console.log('=== INICIALIZANDO PRISMA CLIENT ===');
console.log('NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '***CONFIGURADO***' : 'NÃO CONFIGURADO');

const prismaClientOptions: Prisma.PrismaClientOptions = {
  datasources: {
    db: {
      url: process.env.NODE_ENV === 'production' 
        ? process.env.DATABASE_URL?.replace('postgres://', 'postgresql://')
        : process.env.DATABASE_URL
    }
  },
  log: [
    { level: 'warn' as const, emit: 'stdout' as const },
    { level: 'error' as const, emit: 'stdout' as const },
    ...(process.env.NODE_ENV === 'development' 
      ? [{ level: 'query' as const, emit: 'event' as const }] 
      : [])
  ]
};

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const prisma = global.prisma || new PrismaClient(prismaClientOptions);

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

console.log('=== PRISMA CLIENT INICIALIZADO ===\n');

export default prisma;
