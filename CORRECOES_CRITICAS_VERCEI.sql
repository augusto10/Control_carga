-- CORREÇÕES URGENTES PARA DEPLOY NO VERCEL
-- Execute este SQL diretamente no painel do seu banco de dados

-- 1. Adicionar campo tipo na tabela Motorista (se não existir)
ALTER TABLE "Motorista" ADD COLUMN IF NOT EXISTS tipo TEXT;

-- 2. Definir valores padrão baseado na CNH e transportadora
UPDATE "Motorista"
SET tipo = CASE
    WHEN cnh IS NOT NULL AND cnh != '' THEN 'MOTORISTA'
    WHEN "transportadoraId" = 'RETIRA_CLIENTE' THEN 'CLIENTE'
    WHEN "transportadoraId" = 'RETIRA_VENDEDOR' THEN 'FUNCIONARIO'
    ELSE 'MOTORISTA'
END
WHERE tipo IS NULL;

-- 3. Tornar campo obrigatório
ALTER TABLE "Motorista" ALTER COLUMN tipo SET NOT NULL;

-- 4. Corrigir ACERT para ACCERT em ControleCarga
UPDATE "ControleCarga" SET transportadora = 'ACCERT' WHERE transportadora = 'ACERT';

-- 5. Corrigir ACERT para ACCERT em NotaFiscal
UPDATE "NotaFiscal" SET transportadora = 'ACCERT' WHERE transportadora = 'ACERT';

-- 6. Corrigir ACERT para ACCERT em Motorista
UPDATE "Motorista" SET "transportadoraId" = 'ACCERT' WHERE "transportadoraId" = 'ACERT';

-- 7. Criar tabela MaterialEstoque
CREATE TABLE IF NOT EXISTS "MaterialEstoque" (
    "id" TEXT NOT NULL,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "unidade" TEXT NOT NULL,
    "estoqueAtual" INTEGER NOT NULL DEFAULT 0,
    "estoqueMinimo" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "MaterialEstoque_pkey" PRIMARY KEY ("id")
);

-- 8. Criar tabela SolicitacaoMaterial
CREATE TABLE IF NOT EXISTS "SolicitacaoMaterial" (
    "id" TEXT NOT NULL,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "solicitanteId" TEXT NOT NULL,
    "status" TEXT NOT NULL CHECK ("status" IN ('PENDENTE', 'APROVADA', 'REJEITADA', 'ENTREGUE')),
    "aprovadorId" TEXT,
    "dataAprovacao" TIMESTAMP(3),
    "observacoes" TEXT,
    CONSTRAINT "SolicitacaoMaterial_pkey" PRIMARY KEY ("id")
);

-- 9. Criar tabela ItemSolicitacaoMaterial
CREATE TABLE IF NOT EXISTS "ItemSolicitacaoMaterial" (
    "id" TEXT NOT NULL,
    "solicitacaoId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "quantidadeSolicitada" INTEGER NOT NULL,
    "quantidadeAprovada" INTEGER,
    CONSTRAINT "ItemSolicitacaoMaterial_pkey" PRIMARY KEY ("id")
);

-- 10. Inserir materiais básicos de exemplo
INSERT INTO "MaterialEstoque" ("id", "nome", "descricao", "unidade", "estoqueAtual", "estoqueMinimo")
SELECT gen_random_uuid()::text, 'Fita Adesiva', 'Fita adesiva transparente 48mm x 100m', 'Rolo', 50, 10
WHERE NOT EXISTS (SELECT 1 FROM "MaterialEstoque" WHERE nome = 'Fita Adesiva');

INSERT INTO "MaterialEstoque" ("id", "nome", "descricao", "unidade", "estoqueAtual", "estoqueMinimo")
SELECT gen_random_uuid()::text, 'Stretch Film', 'Filme stretch transparente 500mm x 300m', 'Rolo', 30, 5
WHERE NOT EXISTS (SELECT 1 FROM "MaterialEstoque" WHERE nome = 'Stretch Film');

INSERT INTO "MaterialEstoque" ("id", "nome", "descricao", "unidade", "estoqueAtual", "estoqueMinimo")
SELECT gen_random_uuid()::text, 'Papel A4', 'Resma de papel sulfite A4 75g', 'Resma', 100, 20
WHERE NOT EXISTS (SELECT 1 FROM "MaterialEstoque" WHERE nome = 'Papel A4');

-- 11. Verificações finais
SELECT '=== VERIFICAÇÕES ===' as status;

-- Verificar campo tipo
SELECT 'Campo tipo adicionado' as info, COUNT(*) as registros FROM "Motorista" WHERE tipo IS NOT NULL;

-- Verificar distribuição por tipo
SELECT 'Distribuição por tipo' as info, tipo, COUNT(*) as quantidade FROM "Motorista" GROUP BY tipo;

-- Verificar se não há mais ACERT
SELECT 'ACERT removido de ControleCarga' as info, COUNT(*) as quantidade FROM "ControleCarga" WHERE transportadora = 'ACERT';
SELECT 'ACERT removido de NotaFiscal' as info, COUNT(*) as quantidade FROM "NotaFiscal" WHERE transportadora = 'ACERT';
SELECT 'ACERT removido de Motorista' as info, COUNT(*) as quantidade FROM "Motorista" WHERE "transportadoraId" = 'ACERT';

-- Verificar materiais criados
SELECT 'Materiais criados' as info, COUNT(*) as quantidade FROM "MaterialEstoque";

SELECT '=== CORREÇÕES CONCLUÍDAS ===' as status;
