const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addZanueloToEnum() {
  console.log('Adicionando ZANUELO_TRANSPORTE_LOGISTICA ao enum...');

  try {
    await prisma.$executeRaw`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum
          WHERE enumlabel = 'ZANUELO_TRANSPORTE_LOGISTICA'
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'Transportadora')
        ) THEN
          ALTER TYPE "Transportadora" ADD VALUE 'ZANUELO_TRANSPORTE_LOGISTICA';
        END IF;
      END $$;
    `;

    console.log('ZANUELO_TRANSPORTE_LOGISTICA adicionado ao enum com sucesso!');

    const enumValues = await prisma.$queryRaw`
      SELECT enumlabel
      FROM pg_enum
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'Transportadora')
      ORDER BY enumsortorder;
    `;

    console.log('Transportadoras disponiveis:');
    enumValues.forEach((item) => {
      console.log(`  - ${item.enumlabel}`);
    });
  } catch (error) {
    console.error('Erro ao adicionar ZANUELO_TRANSPORTE_LOGISTICA ao enum:', error);

    if (String(error.message || '').includes('must be owner')) {
      console.error('\nSem permissao para alterar o enum com esta DATABASE_URL.');
      console.error('Use a mesma URL direta/admin do banco que foi usada quando DETAFRA_TRANSPORTES deu certo.');
    }

    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

addZanueloToEnum();
