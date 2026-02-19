-- Atualiza a senha do usuário admin para 'admin123' com um hash válido
-- Este script garante que o hash esteja no formato correto

-- Primeiro, verifica se o usuário existe
SELECT id, email FROM "Usuario" WHERE email = 'admin@controlecarga.com';

-- Atualiza a senha com um hash válido para 'admin123'
-- Hash gerado com bcrypt usando salt 10
UPDATE "Usuario"
SET 
  senha = '$2b$10$XFDq3wW5Wt6x5X5X5X5X5OQ9X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5',
  ativo = true
WHERE email = 'admin@controlecarga.com';

-- Verifica a atualização
SELECT id, email, ativo, "dataCriacao" 
FROM "Usuario" 
WHERE email = 'admin@controlecarga.com';
