const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addRetiraVendedorToEnum() {
  console.log('🔧 Adicionando RETIRA_VENDEDOR ao enum...');

  try {
    // Usar SQL direto para adicionar valor ao enum existente
    await prisma.$executeRaw`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum 
          WHERE enumlabel = 'RETIRA_VENDEDOR' 
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'Transportadora')
        ) THEN
          ALTER TYPE "Transportadora" ADD VALUE 'RETIRA_VENDEDOR';
        END IF;
      END $$;
    `;

    console.log('✅ RETIRA_VENDEDOR adicionado ao enum com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao adicionar ao enum:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addRetiraVendedorToEnum();
