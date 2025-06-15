-- Verificar se já existe um usuário admin
DO $$
DECLARE
  admin_exists BOOLEAN;
  hashed_password TEXT;
BEGIN
  -- Verificar se o usuário admin já existe
  SELECT EXISTS(SELECT 1 FROM "Usuario" WHERE email = 'admin@controlecarga.com') INTO admin_exists;
  
  IF NOT admin_exists THEN
    -- Gerar o hash da senha (você pode gerar um hash de bcrypt online e colocar aqui)
    -- O hash abaixo é para a senha 'admin123'
    hashed_password := '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';
    
    -- Inserir o usuário admin
    INSERT INTO "Usuario" (nome, email, senha, tipo, ativo, "dataCriacao", "ultimoAcesso")
    VALUES (
      'Administrador',
      'admin@controlecarga.com',
      hashed_password,
      'ADMIN',
      true,
      NOW(),
      NOW()
    );
    
    RAISE NOTICE 'Usuário administrador criado com sucesso!';
    RAISE NOTICE 'Email: admin@controlecarga.com';
    RAISE NOTICE 'Senha: admin123';
  ELSE
    RAISE NOTICE 'Usuário administrador já existe no banco de dados.';
  END IF;
END
$$;
