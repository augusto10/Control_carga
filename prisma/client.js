const { PrismaClient } = require('@prisma/client');

// Verifica se já existe uma instância do Prisma Client no global
const globalWithPrisma = global;

// Cria ou reutiliza a instância existente do Prisma Client
const prisma = globalWithPrisma.prisma || new PrismaClient();

// Se não estivermos em produção, salva a instância no global para reutilização
if (process.env.NODE_ENV !== 'production') {
  globalWithPrisma.prisma = prisma;
}

// Adiciona um manipulador de erros global
prisma.$on('error', (e) => {
  console.error('Erro no Prisma Client:', e);
});

module.exports = prisma;
