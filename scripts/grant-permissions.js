// Script para conceder permissões no banco
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function main() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Verificando e concedendo permissões...');
    
    // Ler o SQL de permissões
    const sqlPath = path.join(__dirname, '..', 'sql', 'grant_permissions.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Executar como superusuário se possível
    await prisma.$executeRawUnsafe(sql);
    
    console.log('✅ Permissões concedidas com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao conceder permissões:', error);
    console.error('\nVocê pode precisar executar o SQL manualmente como superusuário.');
    console.error('O arquivo SQL está em: sql/grant_permissions.sql');
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();