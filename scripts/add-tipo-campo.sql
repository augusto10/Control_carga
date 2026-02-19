-- Script SQL para adicionar campo 'tipo' na tabela Motorista
-- Execute este script diretamente no banco de dados

-- 1. Adicionar coluna tipo (se não existir)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Motorista' AND column_name = 'tipo'
    ) THEN
        ALTER TABLE "Motorista" 
        ADD COLUMN tipo TEXT;
        
        RAISE NOTICE 'Coluna tipo adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Coluna tipo já existe';
    END IF;
END $$;

-- 2. Definir valores padrão baseado na CNH
-- Motoristas têm CNH, funcionários e clientes não
UPDATE "Motorista" 
SET tipo = CASE 
    WHEN cnh IS NOT NULL AND cnh != '' THEN 'MOTORISTA'
    WHEN "transportadoraId" = 'RETIRA_CLIENTE' THEN 'CLIENTE'
    WHEN "transportadoraId" = 'RETIRA_VENDEDOR' THEN 'FUNCIONARIO'
    ELSE 'MOTORISTA'
END
WHERE tipo IS NULL;

-- 3. Tornar a coluna NOT NULL após definir valores
ALTER TABLE "Motorista" 
ALTER COLUMN tipo SET NOT NULL;

-- 4. Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_motorista_tipo ON "Motorista"(tipo);

-- 5. Verificar resultado
SELECT 
    tipo,
    COUNT(*) as quantidade,
    COUNT(CASE WHEN cnh IS NOT NULL THEN 1 END) as com_cnh,
    COUNT(CASE WHEN cnh IS NULL THEN 1 END) as sem_cnh
FROM "Motorista" 
GROUP BY tipo
ORDER BY tipo;

-- 6. Mostrar alguns exemplos
SELECT nome, tipo, "transportadoraId", 
       CASE WHEN cnh IS NOT NULL THEN 'Sim' ELSE 'Não' END as tem_cnh
FROM "Motorista" 
ORDER BY tipo, nome 
LIMIT 10;
