import { PrismaClient } from '@prisma/client';

// Adiciona o PrismaClient ao objeto global em desenvolvimento para evitar
// esgotar o limite de conexões do banco de dados.
// Saiba mais: https://pris.ly/d/help/next-js-best-practices
// Atualizado para PostgreSQL padrão - sem relationMode

const prismaClientSingleton = () => {
  // Log para depuração
  console.log('=== PRISMA CLIENT INITIALIZATION ===');
  console.log('NODE_ENV:', process.env.NODE_ENV || 'development');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? '***CONFIGURADO***' : 'NÃO CONFIGURADO');
  
  // Log detalhado apenas em desenvolvimento
  if (process.env.NODE_ENV !== 'production') {
    console.log('Database URL:', process.env.DATABASE_URL || 'Não definido');
  }
  
  console.log('=== FIM DA INICIALIZAÇÃO DO PRISMA ===');
  
  return new PrismaClient({
    log: ['query', 'info', 'warn', 'error']
  });
};

declare global {
  // eslint-disable-next-line no-var
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

// Inicializa o Prisma Client
let prisma: ReturnType<typeof prismaClientSingleton>;

if (process.env.NODE_ENV === 'production') {
  prisma = prismaClientSingleton();
} else {
  if (!global.prisma) {
    global.prisma = prismaClientSingleton();
  }
  prisma = global.prisma;
}

export default prisma;