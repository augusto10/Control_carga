-- CreateEnum para TipoPessoa se não existir
DO $$ BEGIN
    CREATE TYPE "TipoPessoa" AS ENUM ('MOTORISTA', 'FUNCIONARIO', 'CLIENTE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Adicionar coluna tipo à tabela Motorista
ALTER TABLE "Motorista" ADD COLUMN IF NOT EXISTS "tipo" "TipoPessoa";

-- Definir valores padrão baseado na lógica de negócio
UPDATE "Motorista" 
SET "tipo" = CASE 
    WHEN "cnh" IS NOT NULL AND "cnh" != '' THEN 'MOTORISTA'::"TipoPessoa"
    WHEN "transportadoraId" IS NOT NULL THEN 'FUNCIONARIO'::"TipoPessoa"
    ELSE 'MOTORISTA'::"TipoPessoa"
END
WHERE "tipo" IS NULL;

-- Tornar a coluna NOT NULL após definir os valores
ALTER TABLE "Motorista" ALTER COLUMN "tipo" SET NOT NULL;

-- Definir valor padrão para novos registros
ALTER TABLE "Motorista" ALTER COLUMN "tipo" SET DEFAULT 'MOTORISTA';
