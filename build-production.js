#!/usr/bin/env node

/**
 * Script de build seguro para produção
 * Este script NÃO modifica o banco de dados existente
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Iniciando build para PRODUÇÃO...');
console.log('⚠️  Este script NÃO modificará o banco de dados existente');

try {
  // 1. Gerar Prisma Client (sem modificar banco)
  console.log('\n📦 Gerando Prisma Client...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  
  // 2. Verificar se .env existe
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) {
    console.log('⚠️  Arquivo .env não encontrado. Certifique-se de configurar as variáveis de ambiente.');
  }
  
  // 3. Build do Next.js (sem modificar banco)
  console.log('\n🏗️  Fazendo build do Next.js...');
  execSync('npx next build', { stdio: 'inherit' });
  
  console.log('\n✅ Build concluído com sucesso!');
  console.log('📋 Próximos passos:');
  console.log('   1. Configure as variáveis de ambiente no servidor');
  console.log('   2. Execute: npm start');
  console.log('   3. O banco de dados existente será preservado');
  
} catch (error) {
  console.error('\n❌ Erro durante o build:', error.message);
  process.exit(1);
}
