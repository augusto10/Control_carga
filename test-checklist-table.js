const { PrismaClient } = require('@prisma/client');

async function testChecklistTable() {
  const prisma = new PrismaClient();

  try {
    console.log('🧪 Testando tabela ChecklistRecebimento...');

    // Tentar contar registros
    const count = await prisma.$queryRaw`
      SELECT COUNT(*) as total FROM "ChecklistRecebimento"
    `;

    console.log(`✅ Tabela acessível! Registros: ${count[0].total}`);

    // Tentar fazer uma query de teste
    const testQuery = await prisma.$queryRaw`
      SELECT id, dataCriacao, nomeConferente
      FROM "ChecklistRecebimento"
      LIMIT 1
    `;

    console.log('✅ Query de teste executada com sucesso!');
    console.log('🎉 Tabela ChecklistRecebimento está pronta para uso!');

  } catch (error) {
    console.error('❌ Erro ao testar tabela:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testChecklistTable();
