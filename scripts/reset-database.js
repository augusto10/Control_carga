const { execSync } = require('child_process');

console.log('🔄 Resetando banco de dados...');

try {
  // Reset do banco de dados
  console.log('📦 Fazendo push do schema para o banco...');
  execSync('npx prisma db push --force-reset', { stdio: 'inherit' });
  
  console.log('🔧 Gerando Prisma Client...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  
  console.log('✅ Banco de dados resetado com sucesso!');
  console.log('⚠️  ATENÇÃO: Todos os dados foram perdidos!');
  
} catch (error) {
  console.error('❌ Erro ao resetar banco de dados:', error.message);
  process.exit(1);
}
