SELECT current_database(), current_user, version();

-- Verificar tabela de usuários
SELECT * FROM information_schema.tables WHERE table_name = 'Usuario';

-- Verificar primeiros usuários (se a tabela existir)
SELECT * FROM "Usuario" LIMIT 5;
