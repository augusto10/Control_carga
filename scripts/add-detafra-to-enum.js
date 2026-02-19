const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addDetafraToEnum() {
  console.log('🔧 Adicionando DETAFRA_TRANSPORTES ao enum...');

  try {
    // Usar SQL direto para adicionar valor ao enum existente
    await prisma.$executeRaw`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum 
          WHERE enumlabel = 'DETAFRA_TRANSPORTES' 
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'Transportadora')
        ) THEN
          ALTER TYPE "Transportadora" ADD VALUE 'DETAFRA_TRANSPORTES';
        END IF;
      END $$;
    `;

    console.log('✅ DETAFRA_TRANSPORTES adicionado ao enum com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao adicionar ao enum:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addDetafraToEnum();
