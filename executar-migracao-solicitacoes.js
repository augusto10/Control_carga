const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const prisma = new PrismaClient();

  try {
    console.log('🚀 Iniciando migração segura das solicitações de material...');

    // Ler o arquivo SQL
    const sqlPath = path.join(__dirname, 'MIGRACAO_SOLICITACOES_SEGURA.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    // Executar o SQL usando $queryRaw
    await prisma.$queryRaw`${sqlContent}`;

    console.log('✅ Migração executada com sucesso!');
    console.log('📊 Verificando tabelas...');

    // Verificar se as tabelas existem e têm as colunas corretas
    const solicitacaoExists = await prisma.$queryRaw`
      SELECT table_name FROM information_schema.tables
      WHERE table_name = 'SolicitacaoMaterial'
    `;

    const itemExists = await prisma.$queryRaw`
      SELECT table_name FROM information_schema.tables
      WHERE table_name = 'ItemSolicitacaoMaterial'
    `;

    const materialExists = await prisma.$queryRaw`
      SELECT table_name FROM information_schema.tables
      WHERE table_name = 'MaterialEstoque'
    `;

    console.log('📋 Status das tabelas:');
    console.log('- SolicitacaoMaterial:', solicitacaoExists.length > 0 ? '✅ Existe' : '❌ Não existe');
    console.log('- ItemSolicitacaoMaterial:', itemExists.length > 0 ? '✅ Existe' : '❌ Não existe');
    console.log('- MaterialEstoque:', materialExists.length > 0 ? '✅ Existe' : '❌ Não existe');

    // Testar uma consulta simples
    try {
      const count = await prisma.solicitacaoMaterial.count();
      console.log(`📊 Total de solicitações encontradas: ${count}`);
    } catch (error) {
      console.log('⚠️ Erro ao testar consulta (pode ser normal se não há dados):', error.message);
    }

  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runMigration();
