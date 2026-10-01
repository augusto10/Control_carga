const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🔧 Gerando Prisma Client para produção...');

// Definir variáveis de ambiente para produção
process.env.PRISMA_GENERATE_DATAPROXY = 'false';
process.env.PRISMA_SKIP_POSTINSTALL_GENERATE = 'false';
process.env.PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING = '1';
process.env.NODE_ENV = 'production';

console.log('🚀 Executando: npx prisma generate --no-engine');

try {
  // Executar comando simples sem engine
  execSync('npx prisma generate --no-engine', {
    stdio: 'inherit',
    env: {
      ...process.env,
      PRISMA_GENERATE_DATAPROXY: 'false',
      PRISMA_SKIP_POSTINSTALL_GENERATE: 'false',
      PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING: '1'
    }
  });
  console.log('✅ Prisma Client gerado com sucesso!');
} catch (error) {
  console.error('❌ Erro ao gerar o Prisma Client:', error.message);
  // Tentar abordagem alternativa
  try {
    console.log('🔄 Tentando abordagem alternativa...');
    execSync('npx prisma generate', {
      stdio: 'inherit',
      env: {
        ...process.env,
        PRISMA_GENERATE_DATAPROXY: 'false',
        PRISMA_SKIP_POSTINSTALL_GENERATE: 'false',
        PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING: '1'
      }
    });
    console.log('✅ Prisma Client gerado com abordagem alternativa!');
  } catch (fallbackError) {
    console.error('❌ Erro na abordagem alternativa:', fallbackError.message);
    process.exit(1);
  }
}
