-- Create HistoricoEstoque table and TipoMovimentacao enum

-- First create the enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TipoMovimentacao') THEN
        CREATE TYPE "TipoMovimentacao" AS ENUM ('ENTRADA', 'SAIDA', 'AJUSTE');
        RAISE NOTICE 'Enum TipoMovimentacao criado';
    END IF;
END $$;

-- Create the table if it doesn't exist
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

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS "HistoricoEstoque_materialId_idx" ON "HistoricoEstoque"("materialId");
CREATE INDEX IF NOT EXISTS "HistoricoEstoque_dataCriacao_idx" ON "HistoricoEstoque"("dataCriacao");
CREATE INDEX IF NOT EXISTS "HistoricoEstoque_usuarioId_idx" ON "HistoricoEstoque"("usuarioId");

-- Add foreign key constraints if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'HistoricoEstoque_materialId_fkey') THEN
        ALTER TABLE "HistoricoEstoque" ADD CONSTRAINT "HistoricoEstoque_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "MaterialEstoque"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'HistoricoEstoque_usuarioId_fkey') THEN
        ALTER TABLE "HistoricoEstoque" ADD CONSTRAINT "HistoricoEstoque_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
