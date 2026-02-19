-- =====================================================
-- MIGRAÇÃO URGENTE PARA PRODUÇÃO
-- Adiciona campo 'tipo' na tabela Motorista
-- Corrige enum Transportadora (ACERT → ACCERT)
-- =====================================================

-- 1. ADICIONAR CAMPO TIPO NA TABELA MOTORISTA
-- =====================================================
DO $$
BEGIN
    -- Verificar se o campo 'tipo' já existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Motorista' AND column_name = 'tipo'
    ) THEN
        -- Criar enum TipoPessoa se não existir
        CREATE TYPE "TipoPessoa" AS ENUM ('MOTORISTA', 'FUNCIONARIO', 'CLIENTE');
        
        -- Adicionar campo tipo com valor padrão MOTORISTA
        ALTER TABLE "Motorista" ADD COLUMN "tipo" "TipoPessoa" NOT NULL DEFAULT 'MOTORISTA';
        
        RAISE NOTICE 'Campo tipo adicionado com sucesso!';
    ELSE
        RAISE NOTICE 'Campo tipo já existe, pulando...';
    END IF;
END $$;

-- 2. TORNAR CAMPO CNH OPCIONAL
-- =====================================================
DO $$
BEGIN
    -- Verificar se CNH é obrigatório
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Motorista' AND column_name = 'cnh' AND is_nullable = 'NO'
    ) THEN
        -- Tornar CNH opcional
        ALTER TABLE "Motorista" ALTER COLUMN "cnh" DROP NOT NULL;
        
        RAISE NOTICE 'Campo CNH tornado opcional!';
    ELSE
        RAISE NOTICE 'Campo CNH já é opcional, pulando...';
    END IF;
END $$;

-- 3. CORRIGIR ENUM TRANSPORTADORA
-- =====================================================
DO $$
BEGIN
    -- Verificar se ACCERT existe no enum
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'Transportadora' AND e.enumlabel = 'ACCERT'
    ) THEN
        -- Adicionar ACCERT ao enum
        ALTER TYPE "Transportadora" ADD VALUE 'ACCERT';
        
        RAISE NOTICE 'ACCERT adicionado ao enum Transportadora!';
    ELSE
        RAISE NOTICE 'ACCERT já existe no enum, pulando...';
    END IF;
    
    -- Verificar se RETIRA_CLIENTE existe no enum
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'Transportadora' AND e.enumlabel = 'RETIRA_CLIENTE'
    ) THEN
        -- Adicionar RETIRA_CLIENTE ao enum
        ALTER TYPE "Transportadora" ADD VALUE 'RETIRA_CLIENTE';
        
        RAISE NOTICE 'RETIRA_CLIENTE adicionado ao enum Transportadora!';
    ELSE
        RAISE NOTICE 'RETIRA_CLIENTE já existe no enum, pulando...';
    END IF;
END $$;

-- 4. MIGRAR DADOS EXISTENTES ACERT → ACCERT
-- =====================================================
DO $$
BEGIN
    -- Atualizar motoristas com ACERT para ACCERT
    UPDATE "Motorista" 
    SET "transportadoraId" = 'ACCERT' 
    WHERE "transportadoraId" = 'ACERT';
    
    -- Atualizar controles com ACERT para ACCERT
    UPDATE "ControleCarga" 
    SET "transportadora" = 'ACCERT' 
    WHERE "transportadora" = 'ACERT';
    
    RAISE NOTICE 'Dados migrados de ACERT para ACCERT!';
END $$;

-- 5. VERIFICAR MIGRAÇÃO
-- =====================================================
DO $$
DECLARE
    motoristas_count INTEGER;
    controles_count INTEGER;
    tipo_exists BOOLEAN;
BEGIN
    -- Contar motoristas
    SELECT COUNT(*) INTO motoristas_count FROM "Motorista";
    
    -- Contar controles
    SELECT COUNT(*) INTO controles_count FROM "ControleCarga";
    
    -- Verificar se campo tipo existe
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Motorista' AND column_name = 'tipo'
    ) INTO tipo_exists;
    
    RAISE NOTICE '=== VERIFICAÇÃO DA MIGRAÇÃO ===';
    RAISE NOTICE 'Motoristas no banco: %', motoristas_count;
    RAISE NOTICE 'Controles no banco: %', controles_count;
    RAISE NOTICE 'Campo tipo existe: %', tipo_exists;
    RAISE NOTICE '=== MIGRAÇÃO CONCLUÍDA ===';
END $$;
