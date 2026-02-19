-- Migration: Adicionar campo 'tipo' na tabela Motorista
-- Data: 2025-10-01
-- Descrição: Adiciona o campo 'tipo' para diferenciar MOTORISTA, FUNCIONARIO e CLIENTE

-- 1. Criar enum TipoPessoa se não existir
DO $$ BEGIN
    CREATE TYPE "TipoPessoa" AS ENUM ('MOTORISTA', 'FUNCIONARIO', 'CLIENTE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Adicionar coluna 'tipo' com valor padrão MOTORISTA
ALTER TABLE "Motorista" 
ADD COLUMN IF NOT EXISTS "tipo" "TipoPessoa" DEFAULT 'MOTORISTA';

-- 3. Atualizar todos os registros existentes para MOTORISTA (caso a coluna já exista sem valor)
UPDATE "Motorista" 
SET "tipo" = 'MOTORISTA' 
WHERE "tipo" IS NULL;

-- 4. Tornar a coluna NOT NULL
ALTER TABLE "Motorista" 
ALTER COLUMN "tipo" SET NOT NULL;

-- 5. Verificar resultado
SELECT 
    COUNT(*) as total_registros,
    "tipo",
    COUNT(*) FILTER (WHERE "tipo" = 'MOTORISTA') as motoristas,
    COUNT(*) FILTER (WHERE "tipo" = 'FUNCIONARIO') as funcionarios,
    COUNT(*) FILTER (WHERE "tipo" = 'CLIENTE') as clientes
FROM "Motorista"
GROUP BY "tipo";

-- Mensagem de sucesso
SELECT '✅ Coluna tipo adicionada com sucesso!' as status;
