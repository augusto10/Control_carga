// Criar tabela PalletAjuste de forma segura (sem resetar banco)
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function createPalletTableSafe() {
  try {
    console.log('🔨 Criando tabela PalletAjuste de forma segura...');
    
    // SQL para criar a tabela (IF NOT EXISTS para segurança)
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
    
    console.log('📝 Executando SQL para criar tabela...');
    await prisma.$executeRawUnsafe(createTableSQL);
    console.log('✅ Tabela PalletAjuste criada com sucesso!');
    
    // Criar índices para performance
    console.log('📊 Criando índices...');
    
    const createIndexes = [
      `CREATE INDEX IF NOT EXISTS "PalletAjuste_dataRecebimento_idx" ON "PalletAjuste"("dataRecebimento");`,
      `CREATE INDEX IF NOT EXISTS "PalletAjuste_transportadora_idx" ON "PalletAjuste"("transportadora");`,
      `CREATE INDEX IF NOT EXISTS "PalletAjuste_usuarioId_idx" ON "PalletAjuste"("usuarioId");`
    ];
    
    for (const indexSQL of createIndexes) {
      await prisma.$executeRawUnsafe(indexSQL);
    }
    
    console.log('✅ Índices criados com sucesso!');
    
    // Verificar se a tabela foi criada
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'PalletAjuste'
    `;
    
    if (tables.length > 0) {
      console.log('🎉 Tabela PalletAjuste confirmada no banco!');
      
      // Testar inserção de um registro de teste
      console.log('🧪 Testando inserção...');
      const testId = require('crypto').randomUUID();
      
      await prisma.$executeRawUnsafe(`
        INSERT INTO "PalletAjuste" (
          "id", 
          "motorista", 
          "transportadora", 
          "quantidade", 
          "observacao", 
          "usuarioId"
        ) VALUES (
          $1, 
          'Teste Sistema', 
          'ACCERT', 
          1, 
          'Registro de teste - criação da tabela', 
          (SELECT id FROM "Usuario" WHERE tipo = 'ADMIN' LIMIT 1)
        )
      `, testId);
      
      console.log('✅ Registro de teste inserido com sucesso!');
      
      // Contar registros
      const count = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "PalletAjuste"`;
      console.log('📈 Total de registros na tabela:', count);
      
    } else {
      console.log('❌ Erro: Tabela não foi criada');
    }
    
  } catch (error) {
    console.error('❌ Erro ao criar tabela:', error);
    
    if (error.message.includes('already exists')) {
      console.log('ℹ️ Tabela já existe - isso é normal');
    }
  } finally {
    await prisma.$disconnect();
  }
}

createPalletTableSafe();
