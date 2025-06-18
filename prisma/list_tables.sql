-- Lista todas as tabelas no esquema público
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
