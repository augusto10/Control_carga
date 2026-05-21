-- Script seguro para adicionar Zanuelo Transporte e Logistica ao enum Transportadora em producao
-- Idempotente: pode ser executado mais de uma vez sem duplicar ou apagar dados.
-- Execute com o usuario dono do tipo "Transportadora" ou por um painel SQL administrativo.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_enum
        WHERE enumlabel = 'ZANUELO_TRANSPORTE_LOGISTICA'
        AND enumtypid = (
            SELECT oid FROM pg_type WHERE typname = 'Transportadora'
        )
    ) THEN
        ALTER TYPE "Transportadora" ADD VALUE 'ZANUELO_TRANSPORTE_LOGISTICA';
        RAISE NOTICE 'Valor ZANUELO_TRANSPORTE_LOGISTICA adicionado ao enum Transportadora com sucesso.';
    ELSE
        RAISE NOTICE 'Valor ZANUELO_TRANSPORTE_LOGISTICA ja existe no enum Transportadora.';
    END IF;
END $$;

SELECT enumlabel AS transportadora_valores
FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'Transportadora')
ORDER BY enumsortorder;
