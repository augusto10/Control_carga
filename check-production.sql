-- Verificar se é banco de produção
SELECT 
  'ControleCarga' as tabela, 
  COUNT(*) as total_registros,
  MAX("dataCriacao") as ultimo_registro
FROM "ControleCarga"
UNION ALL
SELECT 
  'NotaFiscal' as tabela, 
  COUNT(*) as total_registros,
  MAX("dataCriacao") as ultimo_registro
FROM "NotaFiscal"
UNION ALL
SELECT 
  'Usuario' as tabela, 
  COUNT(*) as total_registros,
  MAX("dataCriacao") as ultimo_registro
FROM "Usuario";
