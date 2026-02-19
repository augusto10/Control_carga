-- Script seguro para adicionar VLOG ao enum Transportadora em produção
-- Este script é idempotente e pode ser executado múltiplas vezes sem problemas
-- Compatível com PostgreSQL 12+

-- Verificar se o valor já existe no enum antes de adicionar
DO $$
BEGIN
    -- Tentar adicionar o novo valor ao enum
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'VLOG' 
        AND enumtypid = (
            SELECT oid FROM pg_type WHERE typname = 'Transportadora'
        )
    ) THEN
        ALTER TYPE "Transportadora" ADD VALUE 'VLOG';
        RAISE NOTICE 'Valor VLOG adicionado ao enum Transportadora com sucesso!';
    ELSE
        RAISE NOTICE 'Valor VLOG já existe no enum Transportadora.';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao adicionar valor ao enum: %', SQLERRM;
END $$;

-- Verificar os valores atuais do enum
SELECT enumlabel as transportadora_valores 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'Transportadora')
ORDER BY enumsortorder;
