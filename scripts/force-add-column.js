const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function forceAddColumn() {
  console.log('🔧 Forçando adição da coluna transportadora...');

  try {
    // Primeiro, verificar se a coluna existe
    const checkColumn = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'ControleCarga' AND column_name = 'transportadora';
    `;
    
    console.log(`📋 Coluna transportadora existe: ${checkColumn.length > 0 ? 'SIM' : 'NÃO'}`);
    
    if (checkColumn.length === 0) {
      // Adicionar a coluna diretamente
      await prisma.$executeRaw`
        ALTER TABLE "ControleCarga" ADD COLUMN "transportadora" "Transportadora";
      `;
      console.log('✅ Coluna transportadora adicionada!');
    } else {
      console.log('ℹ️ Coluna já existe');
    }
    
    // Verificar novamente
    const verifyColumn = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'ControleCarga' AND column_name = 'transportadora';
    `;
    
    console.log('📊 Verificação final:', verifyColumn);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

forceAddColumn();
