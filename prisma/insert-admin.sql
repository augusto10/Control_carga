-- Inserir o usuário administrador se ele não existir
INSERT INTO "Usuario" ("id", "nome", "email", "senha", "tipo", "ativo", "dataCriacao")
SELECT 
    '00000000-0000-0000-0000-000000000000',
    'Administrador',
    'admin@controlecarga.com',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- senha: admin123
    'ADMIN',
    true,
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM "Usuario" WHERE "email" = 'admin@controlecarga.com'
);

-- Verificar se o usuário foi criado
SELECT * FROM "Usuario" WHERE "email" = 'admin@controlecarga.com';
