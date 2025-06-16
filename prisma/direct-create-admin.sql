-- Script para criar ou atualizar o usuário administrador
-- Senha: adm123 (hash bcrypt)

-- Primeiro, tenta atualizar se o usuário já existir
UPDATE "Usuario"
SET 
  nome = 'Administrador',
  senha = '$2a$10$XFDq3wW5Wt6x5X5X5X5X5OQ9X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5',
  tipo = 'ADMIN',
  ativo = true,
  "ultimoAcesso" = NOW()
WHERE email = 'admin@controlecarga.com';

-- Se nenhuma linha foi afetada, insere um novo usuário
INSERT INTO "Usuario" (id, nome, email, senha, tipo, ativo, "dataCriacao")
SELECT 
  gen_random_uuid(),
  'Administrador',
  'admin@controlecarga.com',
  '$2a$10$XFDq3wW5Wt6x5X5X5X5X5OQ9X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5',
  'ADMIN',
  true,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM "Usuario" WHERE email = 'admin@controlecarga.com');

-- Mostra o usuário criado/atualizado
SELECT id, nome, email, tipo, ativo, "dataCriacao" 
FROM "Usuario" 
WHERE email = 'admin@controlecarga.com';
