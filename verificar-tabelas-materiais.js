const { PrismaClient } = require('@prisma/client');

async function verificarTabelasMateriais() {
  const prisma = new PrismaClient();

  try {
    console.log('🔍 Verificando tabelas de materiais...\n');

    // Verificar se as tabelas existem
    const tabelas = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('SolicitacaoMaterial', 'ItemSolicitacaoMaterial', 'MaterialEstoque')
      ORDER BY table_name
    `;

    console.log('📋 Tabelas encontradas:');
    if (tabelas.length === 0) {
      console.log('❌ NENHUMA tabela de materiais encontrada!');
      console.log('💡 Isso explica o erro 500 - as tabelas nunca foram criadas');
    } else {
      tabelas.forEach(t => console.log(`✅ ${t.table_name}`));
    }
    console.log();

    // Se existir SolicitacaoMaterial, tentar contar registros
    if (tabelas.some(t => t.table_name === 'SolicitacaoMaterial')) {
      try {
        const count = await prisma.solicitacaoMaterial.count();
        console.log(`📊 Solicitações encontradas: ${count}`);
      } catch (error) {
        console.log('⚠️ Erro ao contar solicitações:', error.message);
      }
    }

    // Se existir MaterialEstoque, tentar contar materiais
    if (tabelas.some(t => t.table_name === 'MaterialEstoque')) {
      try {
        const count = await prisma.materialEstoque.count();
        console.log(`📦 Materiais encontrados: ${count}`);
      } catch (error) {
        console.log('⚠️ Erro ao contar materiais:', error.message);
      }
    }

  } catch (error) {
    console.error('❌ Erro ao verificar tabelas:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verificarTabelasMateriais();
