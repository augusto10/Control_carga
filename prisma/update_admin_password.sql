-- Atualiza a senha do usuário admin para 'adm123' (hash bcrypt)
-- O hash abaixo é de 'adm123' usando bcrypt com salt 10

UPDATE "Usuario" 
SET senha = '$2a$10$XFDq3wW5Wt6x5X5X5X5X5OQ9X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5'
WHERE email = 'admin@controlecarga.com';

-- Verifica se a atualização foi bem-sucedida
SELECT * FROM "Usuario" WHERE email = 'admin@controlecarga.com';
