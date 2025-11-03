-- Converter usuários com tipo DEMO para USUARIO (dentro de transação)
BEGIN;

-- Backup dos registros que serão alterados (para log/referência)
CREATE TEMPORARY TABLE IF NOT EXISTS _demo_users_backup AS
SELECT id, nome, email, tipo, "dataCriacao"
FROM "Usuario"
WHERE tipo = 'DEMO';

-- Atualizar registros
UPDATE "Usuario"
SET tipo = 'USUARIO',
    "dataAtualizacao" = NOW()
WHERE tipo = 'DEMO';

-- Log dos registros afetados
SELECT id, nome, email, tipo, "dataCriacao"
FROM _demo_users_backup;

COMMIT;