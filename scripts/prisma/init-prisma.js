const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');

// Caminho para o diretório .prisma
const prismaDir = path.join(process.cwd(), 'node_modules/.prisma');

// Verifica se o diretório .prisma existe
if (!fs.existsSync(prismaDir)) {
  console.error('❌ Diretório .prisma não encontrado. Execute `npx prisma generate` primeiro.');
  process.exit(1);
}

// Tenta importar o Prisma Client
let prisma;
try {
  prisma = new PrismaClient();
  console.log('✅ Prisma Client inicializado com sucesso!');
} catch (error) {
  console.error('❌ Erro ao inicializar o Prisma Client:', error);
  process.exit(1);
}

module.exports = prisma;
