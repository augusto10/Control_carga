-- Verifica a estrutura da tabela NotaFiscal
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default,
    character_maximum_length,
    numeric_precision,
    numeric_scale
FROM 
    information_schema.columns 
WHERE 
    table_name = 'NotaFiscal'
ORDER BY 
    ordinal_position;
