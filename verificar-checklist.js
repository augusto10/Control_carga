const { PrismaClient } = require('@prisma/client');

async function verificarTabela() {
  const prisma = new PrismaClient();

  try {
    console.log('🔍 Verificando se tabela ChecklistRecebimento existe...');

    // Método 1: Query simples
    try {
      const result = await prisma.$queryRaw`SELECT COUNT(*) as total FROM "ChecklistRecebimento"`;
      console.log(`✅ Tabela existe! Registros: ${result[0].total}`);
      return true;
    } catch (error) {
      console.log('❌ Tabela não encontrada via query');
    }

    // Método 2: Verificar na lista de tabelas
    console.log('📋 Verificando na lista de tabelas do sistema...');
    const tables = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'ChecklistRecebimento'
    `;

    if (tables.length > 0) {
      console.log('✅ Tabela encontrada na lista do sistema!');
      return true;
    } else {
      console.log('❌ Tabela não encontrada na lista do sistema');
      return false;
    }

  } catch (error) {
    console.error('❌ Erro ao verificar:', error.message);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

verificarTabela();
