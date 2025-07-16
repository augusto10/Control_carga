-- Primeiro, adicione o valor ao enum se ainda não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = 'public'."Transportadora"::regtype 
        AND enumlabel = 'ACCERT'
    ) THEN
        ALTER TYPE "Transportadora" ADD VALUE 'ACCERT';
    END IF;
END $$;

-- Depois, atualize a tabela ControleCarga
ALTER TABLE "ControleCarga" ALTER COLUMN "transportadora" DROP DEFAULT;
ALTER TABLE "ControleCarga" ALTER COLUMN "transportadora" SET DEFAULT 'ACCERT';

-- Crie a tabela Motorista se não existir
CREATE TABLE IF NOT EXISTS "Motorista" (
    "id" TEXT NOT NULL,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nome" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "cnh" TEXT NOT NULL,
    "transportadoraId" "Transportadora" NOT NULL,
    CONSTRAINT "Motorista_pkey" PRIMARY KEY ("id")
);

-- Crie o índice se não existir
CREATE UNIQUE INDEX IF NOT EXISTS "Motorista_cpf_key" ON "Motorista"("cpf");
