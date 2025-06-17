-- Verifica se a tabela Usuario existe
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE  table_schema = 'public'
   AND    table_name   = 'Usuario'
) as table_exists;

-- Conta quantos usuários existem
SELECT COUNT(*) as user_count FROM "Usuario";

-- Lista todos os usuários (limite de 10)
SELECT id, nome, email, tipo, ativo, "dataCriacao" 
FROM "Usuario" 
LIMIT 10;
