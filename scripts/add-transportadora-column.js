const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addTransportadoraColumn() {
  console.log('🔧 Adicionando coluna transportadora à tabela ControleCarga...');

  try {
    // Adicionar coluna transportadora se não existir
    await prisma.$executeRaw`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'ControleCarga' AND column_name = 'transportadora'
        ) THEN
          ALTER TABLE "ControleCarga" ADD COLUMN "transportadora" "Transportadora";
          RAISE NOTICE 'Coluna transportadora adicionada com sucesso!';
        ELSE
          RAISE NOTICE 'Coluna transportadora já existe!';
        END IF;
      END $$;
    `;

    console.log('✅ Operação concluída!');
    
    // Verificar estrutura atualizada
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'ControleCarga' AND column_name = 'transportadora';
    `;
    
    if (columns.length > 0) {
      console.log('✅ Coluna transportadora confirmada na tabela ControleCarga');
    } else {
      console.log('❌ Coluna transportadora ainda não existe');
    }
    
  } catch (error) {
    console.error('❌ Erro ao adicionar coluna:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addTransportadoraColumn();
