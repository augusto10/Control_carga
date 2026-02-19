-- Verifica se o usuário admin existe
SELECT 
  id, 
  nome, 
  email, 
  tipo, 
  ativo, 
  "dataCriacao"
FROM "Usuario" 
WHERE email = 'admin@controlecarga.com';
