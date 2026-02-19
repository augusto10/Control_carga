-- Script para sincronizar banco de produção com schema Prisma
-- Execute este script diretamente no banco PostgreSQL de produção

-- 1. Adicionar coluna 'tipo' na tabela Motorista (se não existir)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'Motorista' AND column_name = 'tipo') THEN
        ALTER TABLE "Motorista" ADD COLUMN "tipo" TEXT DEFAULT 'MOTORISTA';
        RAISE NOTICE 'Coluna tipo adicionada à tabela Motorista';
    ELSE
        RAISE NOTICE 'Coluna tipo já existe na tabela Motorista';
    END IF;
END $$;

-- 2. Atualizar o enum Transportadora (remover ACERT, adicionar ACCERT e RETIRA_CLIENTE)
-- Nota: Primeiro precisamos ver os valores atuais do enum
-- Esta operação pode precisar ser feita manualmente dependendo do estado atual

-- 3. Atualizar dados existentes para usar ACCERT ao invés de ACERT
UPDATE "ControleCarga" SET transportadora = 'ACCERT' WHERE transportadora = 'ACERT';

-- 4. Atualizar dados de motoristas para usar ACCERT ao invés de ACERT
UPDATE "Motorista" SET "transportadoraId" = 'ACCERT' WHERE "transportadoraId" = 'ACERT';

-- 5. Definir tipo padrão para motoristas existentes (se necessário)
UPDATE "Motorista" SET tipo = 'MOTORISTA' WHERE tipo IS NULL OR tipo = '';

-- 6. Verificar se há tabela PalletAjuste (se não existir, será criada pelo próximo deploy)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'PalletAjuste') THEN
        RAISE NOTICE 'Tabela PalletAjuste será criada no próximo deploy Prisma';
    END IF;
END $$;

-- 7. Log das alterações realizadas
DO $$
DECLARE
    controles_atualizados INTEGER;
    motoristas_atualizados INTEGER;
    motoristas_com_tipo INTEGER;
BEGIN
    SELECT COUNT(*) INTO controles_atualizados FROM "ControleCarga" WHERE transportadora = 'ACCERT';
    SELECT COUNT(*) INTO motoristas_atualizados FROM "Motorista" WHERE "transportadoraId" = 'ACCERT';
    SELECT COUNT(*) INTO motoristas_com_tipo FROM "Motorista" WHERE tipo IS NOT NULL;

    RAISE NOTICE '=== RESUMO DAS CORREÇÕES ===';
    RAISE NOTICE 'Controles atualizados (ACERT -> ACCERT): %', controles_atualizados;
    RAISE NOTICE 'Motoristas atualizados (ACERT -> ACCERT): %', motoristas_atualizados;
    RAISE NOTICE 'Motoristas com tipo definido: %', motoristas_com_tipo;
END $$;
