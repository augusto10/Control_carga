const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkTableStructure() {
  console.log('🔍 Verificando estrutura da tabela ControleCarga...');

  try {
    // Verificar colunas da tabela ControleCarga
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'ControleCarga' 
      ORDER BY ordinal_position;
    `;
    
    console.log('📋 Colunas da tabela ControleCarga:');
    columns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    // Verificar se a coluna transportadora existe
    const hasTransportadora = columns.some(col => col.column_name === 'transportadora');
    console.log(`\n🚚 Coluna 'transportadora' existe: ${hasTransportadora ? 'SIM' : 'NÃO'}`);
    
  } catch (error) {
    console.error('❌ Erro ao verificar estrutura:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTableStructure();
