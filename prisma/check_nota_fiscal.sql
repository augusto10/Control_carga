-- Verifica as colunas da tabela NotaFiscal
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'NotaFiscal'
ORDER BY ordinal_position;
