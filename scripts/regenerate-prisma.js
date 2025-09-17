const { execSync } = require('child_process');

console.log('🔄 Regenerando Prisma Client...');

try {
  // Gerar o Prisma Client
  console.log('📦 Executando prisma generate...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  
  console.log('✅ Prisma Client regenerado com sucesso!');
  console.log('');
  console.log('🎯 A nova transportadora RETIRA_VENDEDOR agora está disponível no Prisma Client.');
  
} catch (error) {
  console.error('❌ Erro ao regenerar Prisma Client:', error.message);
  process.exit(1);
}
