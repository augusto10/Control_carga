// Script simples para criar tabela PalletAjuste
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function createPalletTable() {
  try {
    console.log('🔨 Criando tabela PalletAjuste...');
    
    // Primeiro, vamos tentar criar usando o Prisma Client padrão
    // Se falhar, tentaremos SQL direto
    
    try {
      // Tentar usar o modelo Prisma diretamente
      const testCount = await prisma.palletAjuste.count();
      console.log('✅ Tabela PalletAjuste já existe! Total de registros:', testCount);
      return;
    } catch (error) {
      if (error.code === 'P2021' || error.message.includes('does not exist')) {
        console.log('❌ Tabela PalletAjuste não existe. Tentando criar...');
        
        // Tentar criar usando SQL simples
        const createSQL = `
          CREATE TABLE "PalletAjuste" (
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
        
        await prisma.$executeRawUnsafe(createSQL);
        console.log('✅ Tabela PalletAjuste criada!');
        
        // Criar índices
        const indexes = [
          'CREATE INDEX "PalletAjuste_dataRecebimento_idx" ON "PalletAjuste"("dataRecebimento");',
          'CREATE INDEX "PalletAjuste_transportadora_idx" ON "PalletAjuste"("transportadora");',
          'CREATE INDEX "PalletAjuste_usuarioId_idx" ON "PalletAjuste"("usuarioId");'
        ];
        
        for (const index of indexes) {
          try {
            await prisma.$executeRawUnsafe(index);
          } catch (indexError) {
            console.log('⚠️ Aviso ao criar índice:', indexError.message);
          }
        }
        
        console.log('✅ Índices criados!');
        
        // Verificar se funcionou
        const count = await prisma.palletAjuste.count();
        console.log('🎉 Tabela criada com sucesso! Total de registros:', count);
        
      } else {
        throw error;
      }
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
    
    if (error.code === '42501') {
      console.log('💡 Erro de permissão. Você pode precisar executar este comando diretamente no banco:');
      console.log(`
CREATE TABLE "PalletAjuste" (
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
      `);
    }
  } finally {
    await prisma.$disconnect();
  }
}

createPalletTable();
