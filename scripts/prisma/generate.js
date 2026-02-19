const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🔧 Verificando se precisamos gerar o Prisma Client...');

// Verifica se estamos em produção
const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';

// Caminho para o diretório .next
const nextDir = path.join(process.cwd(), '.next');

// Caminho para o diretório do Prisma Client
const prismaClientDir = path.join(process.cwd(), 'node_modules/.prisma/client');

// Verifica se o diretório .next existe
const nextDirExists = fs.existsSync(nextDir);

// Verifica se o diretório do Prisma Client existe
const prismaClientExists = fs.existsSync(prismaClientDir);

// Sempre gere o Prisma Client para evitar versões desatualizadas (ex.: Data Proxy vs Engine local)
console.log('🚀 Gerando Prisma Client...');
try {
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('✅ Prisma Client gerado com sucesso!');
} catch (error) {
  console.error('❌ Erro ao gerar o Prisma Client:', error);
  process.exit(1);
}
