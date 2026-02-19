-- =====================================================
-- MIGRAÇÃO SEGURA PARA PRODUÇÃO - CORRIGIR SCHEMA
-- =====================================================
-- Este script corrige os problemas identificados no Vercel:
-- 1. Adiciona campo 'tipo' na tabela Motorista
-- 2. Corrige enum Transportadora (ACERT → ACCERT)
-- 3. Atualiza dados existentes

-- BACKUP RECOMENDADO ANTES DE EXECUTAR!

BEGIN;

-- =====================================================
-- 1. ADICIONAR CAMPO TIPO NA TABELA MOTORISTA
-- =====================================================

-- Verificar se o campo já existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Motorista' AND column_name = 'tipo'
    ) THEN
        -- Criar enum TipoPessoa se não existir
        CREATE TYPE "TipoPessoa" AS ENUM ('MOTORISTA', 'FUNCIONARIO', 'CLIENTE');
        
        -- Adicionar campo tipo com valor padrão
        ALTER TABLE "Motorista" ADD COLUMN "tipo" "TipoPessoa" DEFAULT 'MOTORISTA';
        
        -- Atualizar todos os registros existentes para MOTORISTA
        UPDATE "Motorista" SET "tipo" = 'MOTORISTA';
        
        RAISE NOTICE 'Campo tipo adicionado à tabela Motorista';
    ELSE
        RAISE NOTICE 'Campo tipo já existe na tabela Motorista';
    END IF;
END $$;

-- =====================================================
-- 2. CORRIGIR ENUM TRANSPORTADORA
-- =====================================================

-- Verificar se ACERT existe e precisa ser corrigido
DO $$
BEGIN
    -- Verificar se existe algum registro com ACERT
    IF EXISTS (
        SELECT 1 FROM "Motorista" WHERE "transportadoraId" = 'ACERT'
        UNION
        SELECT 1 FROM "ControleCarga" WHERE "transportadora" = 'ACERT'
    ) THEN
        -- Adicionar ACCERT ao enum se não existir
        ALTER TYPE "Transportadora" ADD VALUE IF NOT EXISTS 'ACCERT';
        
        -- Atualizar registros de ACERT para ACCERT
        UPDATE "Motorista" SET "transportadoraId" = 'ACCERT' WHERE "transportadoraId" = 'ACERT';
        UPDATE "ControleCarga" SET "transportadora" = 'ACCERT' WHERE "transportadora" = 'ACERT';
        
        RAISE NOTICE 'Registros ACERT atualizados para ACCERT';
    ELSE
        RAISE NOTICE 'Nenhum registro ACERT encontrado para correção';
    END IF;
END $$;

-- =====================================================
-- 3. ADICIONAR RETIRA_CLIENTE SE NÃO EXISTIR
-- =====================================================

DO $$
BEGIN
    -- Adicionar RETIRA_CLIENTE ao enum se não existir
    ALTER TYPE "Transportadora" ADD VALUE IF NOT EXISTS 'RETIRA_CLIENTE';
    RAISE NOTICE 'RETIRA_CLIENTE adicionado ao enum Transportadora';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'RETIRA_CLIENTE já existe no enum Transportadora';
END $$;

-- =====================================================
-- 4. TORNAR CAMPO CNH OPCIONAL
-- =====================================================

DO $$
BEGIN
    -- Verificar se CNH é obrigatório e tornar opcional
    ALTER TABLE "Motorista" ALTER COLUMN "cnh" DROP NOT NULL;
    RAISE NOTICE 'Campo CNH tornado opcional';
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Campo CNH já é opcional ou erro: %', SQLERRM;
END $$;

-- =====================================================
-- 5. VERIFICAÇÕES FINAIS
-- =====================================================

-- Contar registros por tipo
SELECT 
    'Motoristas por tipo' as categoria,
    tipo,
    COUNT(*) as quantidade
FROM "Motorista" 
GROUP BY tipo
UNION ALL
SELECT 
    'Controles por transportadora' as categoria,
    transportadora::text as tipo,
    COUNT(*) as quantidade
FROM "ControleCarga" 
GROUP BY transportadora
ORDER BY categoria, tipo;

-- Verificar se ainda existe ACERT
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM "Motorista" WHERE "transportadoraId" = 'ACERT') 
        THEN 'ERRO: Ainda existem motoristas com ACERT'
        WHEN EXISTS (SELECT 1 FROM "ControleCarga" WHERE "transportadora" = 'ACERT')
        THEN 'ERRO: Ainda existem controles com ACERT'
        ELSE 'OK: Nenhum registro ACERT encontrado'
    END as status_acert;

COMMIT;

-- =====================================================
-- MENSAGEM FINAL
-- =====================================================
SELECT 'MIGRAÇÃO CONCLUÍDA COM SUCESSO!' as resultado;
