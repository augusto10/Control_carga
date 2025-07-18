import { PrismaClient } from '@prisma/client/edge';
import { withAccelerate } from '@prisma/extension-accelerate';

// Configuração otimizada para trabalhar apenas com Prisma Accelerate
// Não requer conexão direta com o banco de dados

const prismaClientSingleton = () => {
  // Log de inicialização
  console.log('=== PRISMA CLIENT INITIALIZATION ===');
  console.log('NODE_ENV:', process.env.NODE_ENV || 'development');
  console.log('Using Prisma Accelerate:', !!process.env.DATABASE_URL?.includes('accelerate.prisma-data.net'));
  
  // Configuração otimizada para o Prisma Accelerate
  const prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL,
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn'] 
      : ['error', 'warn'],
  }).$extends(
    withAccelerate({
      // Configurações adicionais do Accelerate, se necessário
    })
  );

  // Adiciona um manipulador de erros personalizado
  prisma.$extends({
    query: {
      async $allOperations({ operation, model, args, query }) {
        try {
          return await query(args);
        } catch (error) {
          console.error(`Prisma Error in ${model}.${operation}:`, error);
          throw error;
        }
      }
    }
  });
  
  return prisma;
};

declare global {
  // eslint-disable-next-line no-var
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

// Inicializa o Prisma Client
const prisma = globalThis.prisma ?? prismaClientSingleton();

// Apenas em desenvolvimento, adiciona ao global para hot-reload
if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

export default prisma;