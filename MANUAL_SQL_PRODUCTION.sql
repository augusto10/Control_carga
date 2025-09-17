-- ========================================
-- SQL PARA EXECUTAR MANUALMENTE EM PRODUÇÃO
-- ========================================
-- Este SQL cria apenas a tabela PalletAjuste se ela não existir
-- NÃO afeta outras tabelas ou dados existentes
-- Execute no console SQL do seu provedor (Neon, Supabase, etc.)

-- Criar tabela PalletAjuste (apenas se não existir)
CREATE TABLE IF NOT EXISTS "PalletAjuste" (
  id uuid PRIMARY KEY,
  "dataCriacao" timestamptz NOT NULL DEFAULT now(),
  "dataRecebimento" timestamptz NOT NULL DEFAULT now(),
  motorista text NULL,
  transportadora text NULL,
  quantidade integer NOT NULL,
  observacao text NULL,
  "usuarioId" text NOT NULL,
  CONSTRAINT fk_pallet_ajuste_usuario FOREIGN KEY ("usuarioId") REFERENCES "Usuario"(id) ON DELETE RESTRICT
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_pallet_ajuste_data ON "PalletAjuste" ("dataRecebimento");
CREATE INDEX IF NOT EXISTS idx_pallet_ajuste_transportadora ON "PalletAjuste" (transportadora);
CREATE INDEX IF NOT EXISTS idx_pallet_ajuste_usuario ON "PalletAjuste" ("usuarioId");

-- Verificar se a tabela foi criada
SELECT 
  table_name, 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'PalletAjuste' 
ORDER BY ordinal_position;

-- ========================================
-- ADICIONAR NOVA TRANSPORTADORA: RETIRA_VENDEDOR
-- ========================================

-- PASSO 1: Verificar transportadoras atuais
SELECT enumlabel as transportadoras_existentes 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'Transportadora')
ORDER BY enumsortorder;

-- PASSO 2: Adicionar nova transportadora (EXECUTE APENAS UMA DAS OPÇÕES ABAIXO)

-- OPÇÃO A: Comando mais simples (PostgreSQL 11+)
ALTER TYPE "Transportadora" ADD VALUE 'RETIRA_VENDEDOR';

-- OU OPÇÃO B: Se a OPÇÃO A não funcionar, tente esta:
-- ALTER TYPE "Transportadora" ADD VALUE IF NOT EXISTS 'RETIRA_VENDEDOR';

-- PASSO 3: Verificar se foi adicionado
SELECT enumlabel as transportadoras_atualizadas 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'Transportadora')
ORDER BY enumsortorder;

-- ========================================
-- INSTRUÇÕES ALTERNATIVAS (se o SQL acima não funcionar):
-- ========================================
-- 1. Acesse o console SQL do seu provedor (Neon, Supabase, etc.)
-- 2. Execute apenas esta linha:
--    ALTER TYPE "Transportadora" ADD VALUE 'RETIRA_VENDEDOR';
-- 3. Se der erro "already exists", ignore - significa que já foi adicionado
-- 4. Se der erro de sintaxe, tente sem as aspas:
--    ALTER TYPE Transportadora ADD VALUE 'RETIRA_VENDEDOR';

-- ========================================
-- SOLUÇÃO IMPLEMENTADA (funciona sem alterar o banco):
-- ========================================
-- ✅ PROBLEMA RESOLVIDO! O código foi atualizado para funcionar sem alterar o enum.

-- COMO FUNCIONA:
-- 1. MOTORISTAS e CONTROLES "RETIRA_VENDEDOR" são salvos como "TERCEIRIZADA" no banco
-- 2. Um marcador [RV] é adicionado ao nome para identificação
-- 3. Na listagem, o sistema identifica o marcador e mostra como "RETIRA_VENDEDOR"
-- 4. O nome é exibido sem o marcador na interface

-- EXEMPLO MOTORISTA:
-- - Usuário cadastra: João Silva com transportadora RETIRA_VENDEDOR
-- - Salvo no banco: "João Silva [RV]" com transportadora TERCEIRIZADA  
-- - Exibido na tela: João Silva com transportadora RETIRA_VENDEDOR

-- EXEMPLO CONTROLE:
-- - Usuário cria controle: Motorista "Maria Santos" com RETIRA_VENDEDOR
-- - Salvo no banco: "Maria Santos [RV]" com transportadora TERCEIRIZADA
-- - Exibido na tela: Maria Santos com transportadora RETIRA_VENDEDOR

-- QUANDO O ENUM FOR ATUALIZADO:
-- Execute o SQL acima para adicionar RETIRA_VENDEDOR ao enum
-- Depois execute estes scripts para migrar os dados:

-- 1. Migrar motoristas:
-- UPDATE "Motorista" 
-- SET nome = REPLACE(nome, ' [RV]', ''), "transportadoraId" = 'RETIRA_VENDEDOR' 
-- WHERE nome LIKE '%[RV]%';

-- 2. Migrar controles de carga:
-- UPDATE "ControleCarga" 
-- SET motorista = REPLACE(motorista, ' [RV]', ''), transportadora = 'RETIRA_VENDEDOR' 
-- WHERE motorista LIKE '%[RV]%';
