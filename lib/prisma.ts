import { PrismaClient, Prisma } from '@prisma/client';

// Log para depuração
console.log('=== INICIALIZANDO PRISMA CLIENT ===');
console.log('NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '***CONFIGURADO***' : 'NÃO CONFIGURADO');

// Evita múltiplas instâncias do PrismaClient em desenvolvimento
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Configuração do Prisma Client
const prismaOptions: Prisma.PrismaClientOptions = {
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'info', 'warn', 'error']
    : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
};

console.log('Prisma Options:', JSON.stringify({
  ...prismaOptions,
  datasources: { 
    db: { 
      url: prismaOptions.datasources?.db?.url ? '***CONFIGURADO***' : 'NÃO CONFIGURADO' 
    } 
  }
}, null, 2));

// Inicializa o Prisma Client
const prisma = global.prisma || new PrismaClient(prismaOptions);

// Habilita o hot-reload em desenvolvimento
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

// Log de queries em desenvolvimento
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query' as never, (e: any) => {
    console.log('Query: ' + e.query);
    console.log('Params: ' + e.params);
    console.log('Duration: ' + e.duration + 'ms');
  });
}

console.log('=== PRISMA CLIENT INICIALIZADO ===\n');

export default prisma;
