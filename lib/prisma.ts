import { PrismaClient } from '@prisma/client';

// Configuração para conexão direta com PostgreSQL
// Sem Prisma Accelerate - usando conexão direta com o banco de dados

const prismaClientSingleton = () => {
  // Log de inicialização
  console.log('=== PRISMA CLIENT INITIALIZATION ===');
  console.log('NODE_ENV:', process.env.NODE_ENV || 'development');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? '***CONFIGURADO***' : 'NÃO CONFIGURADO');
  console.log('DIRECT_URL:', process.env.DIRECT_URL ? '***CONFIGURADO***' : 'NÃO CONFIGURADO');
  
  // Forçar URL do banco para desenvolvimento local
  const databaseUrl = 'postgres://postgres:suporteadmin@localhost:5432/controle_carga_local?sslmode=disable';
  
  console.log(' Forçando URL do banco:', databaseUrl.split('://')[0] + '://***');
  
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl
      }
    },
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn'] 
      : ['error', 'warn'],
  });

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