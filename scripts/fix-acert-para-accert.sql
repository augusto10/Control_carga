-- Script SQL para corrigir ACERT para ACCERT no banco de produção
-- Execute este script diretamente no banco de dados

-- 1. Atualizar controles de carga
UPDATE "ControleCarga" 
SET transportadora = 'ACCERT' 
WHERE transportadora = 'ACERT';

-- 2. Atualizar notas fiscais
UPDATE "NotaFiscal" 
SET transportadora = 'ACCERT' 
WHERE transportadora = 'ACERT';

-- 3. Atualizar motoristas (se existir o campo transportadoraId)
UPDATE "Motorista" 
SET "transportadoraId" = 'ACCERT' 
WHERE "transportadoraId" = 'ACERT';

-- 4. Verificar resultados
SELECT 'ControleCarga' as tabela, COUNT(*) as total_accert 
FROM "ControleCarga" 
WHERE transportadora = 'ACCERT'
UNION ALL
SELECT 'NotaFiscal' as tabela, COUNT(*) as total_accert 
FROM "NotaFiscal" 
WHERE transportadora = 'ACCERT'
UNION ALL
SELECT 'Motorista' as tabela, COUNT(*) as total_accert 
FROM "Motorista" 
WHERE "transportadoraId" = 'ACCERT';

-- 5. Verificar se ainda existe ACERT (deve retornar 0)
SELECT 'ControleCarga_ACERT' as problema, COUNT(*) as quantidade 
FROM "ControleCarga" 
WHERE transportadora = 'ACERT'
UNION ALL
SELECT 'NotaFiscal_ACERT' as problema, COUNT(*) as quantidade 
FROM "NotaFiscal" 
WHERE transportadora = 'ACERT'
UNION ALL
SELECT 'Motorista_ACERT' as problema, COUNT(*) as quantidade 
FROM "Motorista" 
WHERE "transportadoraId" = 'ACERT';
