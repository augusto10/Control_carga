// Create HistoricoEstoque table
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function createHistoricoEstoqueTable() {
  try {
    console.log('🔍 Creating HistoricoEstoque table...');

    // Execute raw SQL to create the table
    await prisma.$executeRaw`
      -- Create enum if not exists
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TipoMovimentacao') THEN
              CREATE TYPE "TipoMovimentacao" AS ENUM ('ENTRADA', 'SAIDA', 'AJUSTE');
              RAISE NOTICE 'Enum TipoMovimentacao created';
          END IF;
      END $$;
    `;

    await prisma.$executeRaw`
      -- Create table if not exists
      CREATE TABLE IF NOT EXISTS "HistoricoEstoque" (
          "id" TEXT NOT NULL,
          "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "materialId" TEXT NOT NULL,
          "tipo" "TipoMovimentacao" NOT NULL,
          "quantidade" INTEGER NOT NULL,
          "quantidadeAntes" INTEGER NOT NULL,
          "quantidadeDepois" INTEGER NOT NULL,
          "usuarioId" TEXT NOT NULL,
          "observacao" TEXT,
          "solicitacaoId" TEXT,
          CONSTRAINT "HistoricoEstoque_pkey" PRIMARY KEY ("id")
      );
    `;

    await prisma.$executeRaw`
      -- Create indexes if not exist
      CREATE INDEX IF NOT EXISTS "HistoricoEstoque_materialId_idx" ON "HistoricoEstoque"("materialId");
      CREATE INDEX IF NOT EXISTS "HistoricoEstoque_dataCriacao_idx" ON "HistoricoEstoque"("dataCriacao");
      CREATE INDEX IF NOT EXISTS "HistoricoEstoque_usuarioId_idx" ON "HistoricoEstoque"("usuarioId");
    `;

    await prisma.$executeRaw`
      -- Add foreign keys if not exist
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'HistoricoEstoque_materialId_fkey') THEN
              ALTER TABLE "HistoricoEstoque" ADD CONSTRAINT "HistoricoEstoque_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "MaterialEstoque"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
          END IF;

          IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'HistoricoEstoque_usuarioId_fkey') THEN
              ALTER TABLE "HistoricoEstoque" ADD CONSTRAINT "HistoricoEstoque_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
          END IF;
      END $$;
    `;

    console.log('✅ HistoricoEstoque table created successfully');

    // Verify the table was created
    const result = await prisma.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'HistoricoEstoque'`;
    if (result.length > 0) {
      console.log('✅ Table verified in database');
    } else {
      console.log('❌ Table not found after creation');
    }

  } catch (error) {
    console.error('❌ Error creating table:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createHistoricoEstoqueTable();
