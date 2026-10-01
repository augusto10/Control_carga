const { PrismaClient } = require('@prisma/client');

async function verificarColunasSolicitacao() {
  const prisma = new PrismaClient();

  try {
    console.log('🔍 Verificando colunas da tabela SolicitacaoMaterial...\n');

    // Verificar colunas da tabela SolicitacaoMaterial
    const colunas = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'SolicitacaoMaterial'
      ORDER BY ordinal_position;
    `;

    console.log('📊 Colunas encontradas na tabela SolicitacaoMaterial:');
    colunas.forEach(col => {
      const opcional = col.is_nullable === 'YES' ? '(opcional)' : '(obrigatório)';
      const padrao = col.column_default ? ` [padrão: ${col.column_default}]` : '';
      console.log(`  - ${col.column_name}: ${col.data_type} ${opcional}${padrao}`);
    });

    console.log('\n🔍 Procurando por numeroSolicitacao...');
    const temNumeroSolicitacao = colunas.some(col => col.column_name === 'numeroSolicitacao');
    console.log(`Coluna 'numeroSolicitacao' existe: ${temNumeroSolicitacao ? '✅ SIM' : '❌ NÃO'}`);

    if (temNumeroSolicitacao) {
      console.log('❌ Problema: A coluna existe no banco mas não no schema Prisma!');
    } else {
      console.log('✅ Coluna não existe no banco (correto)');
      console.log('💡 Problema pode ser cache do cliente Prisma');
    }

  } catch (error) {
    console.error('❌ Erro ao verificar colunas:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verificarColunasSolicitacao();
