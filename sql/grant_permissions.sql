-- Script para conceder permissões necessárias
DO $$
DECLARE
    _db_user TEXT;
BEGIN
    -- Pega o usuário atual
    SELECT current_user INTO _db_user;
    
    -- Concede permissões no schema public
    EXECUTE format('GRANT ALL ON SCHEMA public TO %I', _db_user);
    EXECUTE format('GRANT ALL ON ALL TABLES IN SCHEMA public TO %I', _db_user);
    EXECUTE format('GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO %I', _db_user);
    
    -- Configura permissões padrão para objetos futuros
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO %I', _db_user);
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO %I', _db_user);
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TYPES TO %I', _db_user);
    
    -- Permite criação de objetos no schema public
    EXECUTE format('GRANT CREATE ON SCHEMA public TO %I', _db_user);
END $$;