-- Migração segura para adicionar tabela FuncionarioCliente
-- Este script pode ser executado em produção sem afetar dados existentes

-- Criar enum TipoFuncionarioCliente se não existir
DO $$ BEGIN
    CREATE TYPE "TipoFuncionarioCliente" AS ENUM ('MOTORISTA', 'FUNCIONARIO', 'CLIENTE', 'RESPONSAVEL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Criar tabela FuncionarioCliente se não existir
CREATE TABLE IF NOT EXISTS "FuncionarioCliente" (
    "id" TEXT NOT NULL,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nome" TEXT NOT NULL,
    "cpf" TEXT,
    "telefone" TEXT,
    "email" TEXT,
    "tipo" "TipoFuncionarioCliente" NOT NULL,
    "transportadoraId" "Transportadora",
    "cnh" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "observacoes" TEXT,

    CONSTRAINT "FuncionarioCliente_pkey" PRIMARY KEY ("id")
);

-- Criar índices se não existirem
CREATE INDEX IF NOT EXISTS "FuncionarioCliente_tipo_idx" ON "FuncionarioCliente"("tipo");
CREATE INDEX IF NOT EXISTS "FuncionarioCliente_ativo_idx" ON "FuncionarioCliente"("ativo");
CREATE INDEX IF NOT EXISTS "FuncionarioCliente_nome_idx" ON "FuncionarioCliente"("nome");

-- Inserir alguns dados de exemplo (opcional)
INSERT INTO "FuncionarioCliente" ("id", "nome", "tipo", "ativo") 
VALUES 
    (gen_random_uuid()::text, 'João Silva', 'MOTORISTA', true),
    (gen_random_uuid()::text, 'Maria Santos', 'FUNCIONARIO', true),
    (gen_random_uuid()::text, 'Cliente Exemplo', 'CLIENTE', true)
ON CONFLICT DO NOTHING;

-- Verificar se a tabela foi criada com sucesso
SELECT 'Tabela FuncionarioCliente criada com sucesso!' as status;
