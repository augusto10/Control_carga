-- Primeiro, remover a coluna que usa o enum Transportadora
ALTER TABLE "ControleCarga" DROP COLUMN IF EXISTS "transportadora";

-- Adicionar a nova coluna transportadoraId se não existir
ALTER TABLE "ControleCarga" ADD COLUMN IF NOT EXISTS "transportadoraId" TEXT DEFAULT 'accert-default';

-- Agora remover o tipo enum
DROP TYPE IF EXISTS "Transportadora" CASCADE;
