-- Senha: admin123 (já em hash bcrypt)
-- O hash abaixo é de 'admin123' usando bcrypt com salt 10

-- Primeiro, verifica se o usuário já existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "Usuario" WHERE email = 'admin@controlecarga.com') THEN
    INSERT INTO "Usuario" (id, nome, email, senha, tipo, ativo, "dataCriacao")
    VALUES (
      gen_random_uuid(),
      'Administrador',
      'admin@controlecarga.com',
      '$2a$10$N9qo8uLOickgx2ZMRZoMy.MQDqShPs6fE5kDHhWknKL1sL3HW2Px6',
      'ADMIN',
      true,
      NOW()
    );
    
    RAISE NOTICE 'Usuário administrador criado com sucesso!';
  ELSE
    RAISE NOTICE 'Usuário administrador já existe';
  END IF;
END $$;
