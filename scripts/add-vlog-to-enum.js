const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addVlogToEnum() {
  console.log('🔧 Adicionando VLOG ao enum de transportadoras...');

  try {
    // Usar SQL direto para adicionar valor ao enum existente
    await prisma.$executeRaw`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum 
          WHERE enumlabel = 'VLOG' 
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'Transportadora')
        ) THEN
          ALTER TYPE "Transportadora" ADD VALUE 'VLOG';
        END IF;
      END $$;
    `;

    console.log('✅ VLOG adicionado ao enum com sucesso!');
    
    // Verificar se VLOG foi adicionado
    const enumValues = await prisma.$queryRaw`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'Transportadora')
      ORDER BY enumlabel;
    `;
    
    console.log('📋 Transportadoras disponíveis:');
    enumValues.forEach(item => {
      console.log(`  - ${item.enumlabel}`);
    });
    
  } catch (error) {
    console.error('❌ Erro ao adicionar VLOG ao enum:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addVlogToEnum();
