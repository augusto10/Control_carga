const { PrismaClient } = require('@prisma/client');

async function verificarChecklistTable() {
  const prisma = new PrismaClient();

  try {
    console.log('🔍 Verificando tabela ChecklistRecebimento...');

    const count = await prisma.$queryRaw`
      SELECT COUNT(*) as total FROM "ChecklistRecebimento"
    `;

    console.log(`✅ Tabela ChecklistRecebimento existe!`);
    console.log(`📊 Registros: ${count[0].total}`);

  } catch (error) {
    if (error.message.includes('does not exist')) {
      console.log('❌ Tabela ChecklistRecebimento ainda não existe');
    } else {
      console.error('❌ Erro:', error.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

verificarChecklistTable();
