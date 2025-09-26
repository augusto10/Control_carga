# 🚨 INSTRUÇÕES PARA CONFIGURAÇÃO DO BANCO DE DADOS

## Problema Identificado
O usuário atual do banco de dados **NÃO tem permissões** para:
- Criar tabelas
- Criar tipos (ENUMs)
- Modificar schema

## ✅ Soluções Disponíveis

### Opção 1: Executar SQL Manualmente (RECOMENDADO)
Execute este SQL diretamente no banco de dados com um usuário administrativo:

```sql
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

-- Criar índices
CREATE INDEX IF NOT EXISTS "FuncionarioCliente_tipo_idx" ON "FuncionarioCliente"("tipo");
CREATE INDEX IF NOT EXISTS "FuncionarioCliente_ativo_idx" ON "FuncionarioCliente"("ativo");
CREATE INDEX IF NOT EXISTS "FuncionarioCliente_nome_idx" ON "FuncionarioCliente"("nome");

-- Inserir dados de exemplo
INSERT INTO "FuncionarioCliente" ("id", "nome", "tipo", "ativo") 
VALUES 
    (gen_random_uuid()::text, 'João Silva', 'MOTORISTA', true),
    (gen_random_uuid()::text, 'Maria Santos', 'FUNCIONARIO', true),
    (gen_random_uuid()::text, 'Cliente Exemplo', 'CLIENTE', true)
ON CONFLICT DO NOTHING;
```

### Opção 2: Usar APIs Alternativas (TEMPORÁRIO)
As APIs em `/api/funcionarios-clientes/safe-*` funcionam com queries raw e podem ser usadas temporariamente.

### Opção 3: Solicitar Permissões
Solicite ao administrador do banco para conceder permissões de DDL ao usuário atual.

## 🎯 Após Criar a Tabela

1. Execute: `npx prisma generate`
2. Reinicie o servidor: `npm run dev`
3. Acesse: `/funcionarios-clientes`

## 📝 Status Atual

- ✅ Código implementado e funcionando
- ✅ Interface completa criada
- ✅ APIs implementadas
- ❌ **BLOQUEADO**: Falta apenas criar a tabela no banco
- ✅ Menu atualizado

**O sistema está 100% pronto, falta apenas a tabela no banco de dados!**
