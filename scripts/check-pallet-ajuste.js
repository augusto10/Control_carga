const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkPalletAjusteTable() {
  try {
    console.log('🔍 Verificando se a tabela PalletAjuste existe...');
    
    // Tenta fazer uma consulta simples na tabela
    const count = await prisma.palletAjuste.count();
    console.log(`✅ Tabela PalletAjuste existe! Total de registros: ${count}`);
    
    // Lista alguns registros se existirem
    if (count > 0) {
      const registros = await prisma.palletAjuste.findMany({
        take: 3,
        orderBy: { dataCriacao: 'desc' }
      });
      console.log('📋 Últimos registros:');
      registros.forEach((r, i) => {
        console.log(`  ${i + 1}. ID: ${r.id}, Quantidade: ${r.quantidade}, Data: ${r.dataCriacao}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro ao acessar tabela PalletAjuste:', error.message);
    
    if (error.message.includes('does not exist') || error.message.includes('não existe')) {
      console.log('🔧 A tabela PalletAjuste não existe. Criando...');
      await createPalletAjusteTable();
    } else {
      console.log('💡 Possíveis soluções:');
      console.log('  1. Execute: npx prisma db push');
      console.log('  2. Execute: npx prisma migrate dev');
      console.log('  3. Verifique se o banco de dados está acessível');
    }
  } finally {
    await prisma.$disconnect();
  }
}

async function createPalletAjusteTable() {
  try {
    console.log('🔨 Criando tabela PalletAjuste...');
    
    // SQL para criar a tabela
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS "PalletAjuste" (
        "id" TEXT NOT NULL,
        "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "dataRecebimento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "motorista" TEXT,
        "transportadora" TEXT,
        "quantidade" INTEGER NOT NULL,
        "observacao" TEXT,
        "usuarioId" TEXT NOT NULL,
        CONSTRAINT "PalletAjuste_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "PalletAjuste_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
      );
    `;
    
    await prisma.$executeRawUnsafe(createTableSQL);
    console.log('✅ Tabela PalletAjuste criada com sucesso!');
    
    // Testa a tabela criada
    const count = await prisma.palletAjuste.count();
    console.log(`📊 Tabela verificada. Total de registros: ${count}`);
    
  } catch (error) {
    console.error('❌ Erro ao criar tabela PalletAjuste:', error.message);
  }
}

// Executa a verificação
checkPalletAjusteTable()
  .then(() => {
    console.log('🎉 Verificação concluída!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Erro fatal:', error);
    process.exit(1);
  });
