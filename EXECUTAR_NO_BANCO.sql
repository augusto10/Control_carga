-- Execute este SQL diretamente no seu banco de dados PostgreSQL
-- para criar a tabela FuncionarioCliente

-- Criar tabela FuncionarioCliente
CREATE TABLE IF NOT EXISTS "FuncionarioCliente" (
    "id" TEXT NOT NULL,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nome" TEXT NOT NULL,
    "cpf" TEXT,
    "telefone" TEXT,
    "email" TEXT,
    "tipo" TEXT NOT NULL CHECK ("tipo" IN ('MOTORISTA', 'FUNCIONARIO', 'CLIENTE', 'RESPONSAVEL')),
    "transportadoraId" TEXT,
    "cnh" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "observacoes" TEXT,
    CONSTRAINT "FuncionarioCliente_pkey" PRIMARY KEY ("id")
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS "FuncionarioCliente_tipo_idx" ON "FuncionarioCliente"("tipo");
CREATE INDEX IF NOT EXISTS "FuncionarioCliente_ativo_idx" ON "FuncionarioCliente"("ativo");
CREATE INDEX IF NOT EXISTS "FuncionarioCliente_nome_idx" ON "FuncionarioCliente"("nome");

-- Inserir alguns dados de exemplo
INSERT INTO "FuncionarioCliente" ("id", "nome", "tipo", "ativo") 
SELECT gen_random_uuid()::text, 'João Silva', 'MOTORISTA', true
WHERE NOT EXISTS (SELECT 1 FROM "FuncionarioCliente" WHERE nome = 'João Silva');

INSERT INTO "FuncionarioCliente" ("id", "nome", "tipo", "ativo") 
SELECT gen_random_uuid()::text, 'Maria Santos', 'FUNCIONARIO', true
WHERE NOT EXISTS (SELECT 1 FROM "FuncionarioCliente" WHERE nome = 'Maria Santos');

INSERT INTO "FuncionarioCliente" ("id", "nome", "tipo", "ativo") 
SELECT gen_random_uuid()::text, 'Cliente Exemplo', 'CLIENTE', true
WHERE NOT EXISTS (SELECT 1 FROM "FuncionarioCliente" WHERE nome = 'Cliente Exemplo');

-- Verificar se foi criado com sucesso
SELECT 'Tabela FuncionarioCliente criada com sucesso!' as status, COUNT(*) as registros FROM "FuncionarioCliente";
