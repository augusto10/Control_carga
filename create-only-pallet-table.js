// Criar apenas a tabela PalletAjuste sem afetar outras tabelas
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function createOnlyPalletTable() {
  try {
    console.log('🔨 Criando apenas a tabela PalletAjuste...');
    
    // SQL para criar apenas a tabela PalletAjuste
    const createPalletTableSQL = `
      CREATE TABLE IF NOT EXISTS "PalletAjuste" (
        "id" TEXT NOT NULL,
        "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "dataRecebimento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "motorista" TEXT,
        "transportadora" TEXT,
        "quantidade" INTEGER NOT NULL,
        "observacao" TEXT,
        "usuarioId" TEXT NOT NULL,
        CONSTRAINT "PalletAjuste_pkey" PRIMARY KEY ("id")
      );
    `;
    
    console.log('📝 Executando SQL...');
    await prisma.$executeRawUnsafe(createPalletTableSQL);
    console.log('✅ Tabela PalletAjuste criada!');
    
    // Criar índices
    const createIndexesSQL = [
      `CREATE INDEX IF NOT EXISTS "PalletAjuste_dataRecebimento_idx" ON "PalletAjuste"("dataRecebimento");`,
      `CREATE INDEX IF NOT EXISTS "PalletAjuste_transportadora_idx" ON "PalletAjuste"("transportadora");`,
      `CREATE INDEX IF NOT EXISTS "PalletAjuste_usuarioId_idx" ON "PalletAjuste"("usuarioId");`
    ];
    
    for (const indexSQL of createIndexesSQL) {
      await prisma.$executeRawUnsafe(indexSQL);
    }
    console.log('✅ Índices criados!');
    
    // Verificar se foi criada
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'PalletAjuste'
    `;
    
    if (tables.length > 0) {
      console.log('🎉 Tabela PalletAjuste confirmada!');
      
      // Testar o modelo Prisma
      console.log('🧪 Testando modelo Prisma...');
      const count = await prisma.palletAjuste.count();
      console.log(`📊 Total de registros: ${count}`);
      
      console.log('✅ Tudo funcionando! Os ajustes de pallets devem funcionar agora.');
      
    } else {
      console.log('❌ Tabela não foi criada');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
    
    if (error.message.includes('permission denied')) {
      console.log('💡 Erro de permissão. Tente executar com um usuário com mais privilégios.');
    } else if (error.message.includes('already exists')) {
      console.log('ℹ️ Tabela já existe - isso é bom!');
      
      // Testar se funciona
      try {
        const count = await prisma.palletAjuste.count();
        console.log(`📊 Total de registros: ${count}`);
        console.log('✅ Tabela existente está funcionando!');
      } catch (testError) {
        console.error('❌ Erro ao testar tabela existente:', testError);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

createOnlyPalletTable();
