-- Alterar o valor padrão para ACCERT
ALTER TABLE "ControleCarga" 
ALTER COLUMN "transportadora" 
SET DEFAULT 'ACCERT'::"Transportadora";

-- Atualizar registros existentes que usam o valor antigo
UPDATE "ControleCarga" 
SET "transportadora" = 'ACCERT' 
WHERE "transportadora" = 'ACERT';
