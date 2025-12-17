-- SQL para corrigir dados de VLOG que foram salvos como TERCEIRIZADA
-- Execute este SQL no seu banco de dados (Neon, PostgreSQL, etc.)

-- 1. Primeiro, verifique se há dados que precisam ser corrigidos
SELECT 
  'ControleCarga' as tabela,
  COUNT(*) as total_terceirizada,
  COUNT(*) FILTER (WHERE motorista ILIKE '%vlog%' OR responsavel ILIKE '%vlog%') as possiveis_vlog
FROM "ControleCarga" 
WHERE transportadora = 'TERCEIRIZADA'

UNION ALL

SELECT 
  'Motorista' as tabela,
  COUNT(*) as total_terceirizada,
  COUNT(*) FILTER (WHERE nome ILIKE '%vlog%') as possiveis_vlog
FROM "Motorista" 
WHERE transportadoraId = 'TERCEIRIZADA'

UNION ALL

SELECT 
  'PalletAjuste' as tabela,
  COUNT(*) as total_terceirizada,
  COUNT(*) FILTER (WHERE motorista ILIKE '%vlog%' OR observacao ILIKE '%vlog%') as possiveis_vlog
FROM "PalletAjuste" 
WHERE transportadora = 'TERCEIRIZADA';

-- 2. Se encontrar dados que precisam ser corrigidos, use os UPDATEs abaixo
-- ATENÇÃO: Execute apenas se tiver certeza de que os dados são da VLOG!

-- Para corrigir ControlesCarga (descomente se necessário)
-- UPDATE "ControleCarga" 
-- SET transportadora = 'VLOG'
-- WHERE transportadora = 'TERCEIRIZADA' 
-- AND (
--   motorista ILIKE '%vlog%' OR 
--   responsavel ILIKE '%vlog%' OR
--   observacao ILIKE '%vlog%'
-- );

-- Para corrigir Motoristas (descomente se necessário)
-- UPDATE "Motorista" 
-- SET transportadoraId = 'VLOG'
-- WHERE transportadoraId = 'TERCEIRIZADA' 
-- AND nome ILIKE '%vlog%';

-- Para corrigir PalletAjuste (descomente se necessário)
-- UPDATE "PalletAjuste" 
-- SET transportadora = 'VLOG'
-- WHERE transportadora = 'TERCEIRIZADA' 
-- AND (
--   motorista ILIKE '%vlog%' OR 
--   observacao ILIKE '%vlog%'
-- );

-- 3. Verifique o resultado após a correção
SELECT 
  'Após correção - ControleCarga' as info,
  transportadora,
  COUNT(*) as total
FROM "ControleCarga" 
WHERE transportadora IN ('VLOG', 'TERCEIRIZADA')
GROUP BY transportadora

UNION ALL

SELECT 
  'Após correção - Motorista' as info,
  transportadoraId as transportadora,
  COUNT(*) as total
FROM "Motorista" 
WHERE transportadoraId IN ('VLOG', 'TERCEIRIZADA')
GROUP BY transportadoraId

UNION ALL

SELECT 
  'Após correção - PalletAjuste' as info,
  transportadora,
  COUNT(*) as total
FROM "PalletAjuste" 
WHERE transportadora IN ('VLOG', 'TERCEIRIZADA')
GROUP BY transportadora;
