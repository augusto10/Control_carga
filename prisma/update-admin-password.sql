-- Atualiza a senha do usuário admin para 'admin123'
-- Hash gerado: $2b$10$aHGR.nSIKISdpb7fBI6mGuqG1U1Fx2GjwuT99ZczBp.cSGGItyKUp2

-- Atualiza a senha
UPDATE "Usuario"
SET senha = '$2b$10$aHGR.nSIKISdpb7fBI6mGuqG1U1Fx2GjwuT99ZczBp.cSGGItyKUp2'
WHERE email = 'admin@controlecarga.com';

-- Verifica a atualização
SELECT id, nome, email, tipo, ativo, "dataCriacao" 
FROM "Usuario" 
WHERE email = 'admin@controlecarga.com';
