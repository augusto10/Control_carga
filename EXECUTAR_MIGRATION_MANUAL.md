# ⚠️ Migration Manual Necessária - Campo `tipo` na Tabela Motorista

## 🔥 Problema

A migration automática falhou com erro de permissão:

```
ERROR: permission denied for schema public
Code: 42501
```

O usuário do banco de dados não tem permissão para criar tipos (enums) ou alterar tabelas.

## ✅ Solução: Executar Migration Manualmente

### **Opção 1: Via Painel do Neon/Supabase (RECOMENDADO)**

1. **Acessar o painel do seu banco de dados**
   - Neon: https://console.neon.tech
   - Supabase: https://app.supabase.com

2. **Abrir o SQL Editor**
   - Neon: Aba "SQL Editor"
   - Supabase: Aba "SQL Editor"

3. **Copiar e executar o SQL abaixo:**

```sql
-- ========================================
-- Migration: Adicionar campo 'tipo' na tabela Motorista
-- Data: 2025-10-01
-- ========================================

-- 1. Criar enum TipoPessoa se não existir
DO $$ BEGIN
    CREATE TYPE "TipoPessoa" AS ENUM ('MOTORISTA', 'FUNCIONARIO', 'CLIENTE');
EXCEPTION
    WHEN duplicate_object THEN 
        RAISE NOTICE 'Enum TipoPessoa já existe, pulando...';
END $$;

-- 2. Adicionar coluna 'tipo' se não existir
DO $$ BEGIN
    ALTER TABLE "Motorista" 
    ADD COLUMN "tipo" "TipoPessoa" DEFAULT 'MOTORISTA' NOT NULL;
    
    RAISE NOTICE 'Coluna tipo adicionada com sucesso!';
EXCEPTION
    WHEN duplicate_column THEN 
        RAISE NOTICE 'Coluna tipo já existe, pulando...';
END $$;

-- 3. Atualizar registros existentes (garantia)
UPDATE "Motorista" 
SET "tipo" = 'MOTORISTA' 
WHERE "tipo" IS NULL OR "tipo" = 'MOTORISTA';

-- 4. Verificar resultado
SELECT 
    'Motorista' as tabela,
    COUNT(*) as total_registros,
    COUNT(*) FILTER (WHERE "tipo" = 'MOTORISTA') as motoristas,
    COUNT(*) FILTER (WHERE "tipo" = 'FUNCIONARIO') as funcionarios,
    COUNT(*) FILTER (WHERE "tipo" = 'CLIENTE') as clientes
FROM "Motorista";

-- 5. Mensagem final
SELECT '✅ Migration concluída com sucesso!' as status;
```

4. **Executar o SQL**
   - Clicar em "Run" ou "Execute"
   - Verificar se não há erros

5. **Verificar resultado**
   - Deve mostrar: "✅ Migration concluída com sucesso!"
   - Deve mostrar a contagem de motoristas

### **Opção 2: Via Cliente PostgreSQL (psql)**

Se você tem acesso direto ao banco via `psql`:

```bash
# Conectar ao banco (substitua com sua connection string)
psql "postgresql://user:password@host/database?sslmode=require"

# Copiar e colar o SQL acima
# Pressionar Enter para executar
```

### **Opção 3: Via Script Node.js Local**

Se você tem a `DATABASE_URL` configurada localmente:

```bash
# No terminal, na raiz do projeto
node scripts/add-tipo-motorista.js
```

**Nota:** Isso só funcionará se o usuário local tiver permissões adequadas.

## 🧪 Validação

Após executar a migration, verifique se funcionou:

### **1. Verificar no Painel do Banco**

Execute este SQL:

```sql
-- Verificar se a coluna existe
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'Motorista' 
AND column_name = 'tipo';

-- Verificar dados
SELECT id, nome, tipo, "transportadoraId"
FROM "Motorista"
LIMIT 5;
```

### **2. Testar as APIs**

Acesse a aplicação em produção e teste:

- ✅ `/api/motoristas` - Deve retornar 200 (não mais 500)
- ✅ `/api/pessoas` - Deve retornar 200
- ✅ `/api/pessoas/para-controles` - Deve retornar 200

### **3. Verificar Logs da Vercel**

Acesse os logs da Vercel e verifique se não há mais erros:
- ❌ **ANTES**: `The column Motorista.tipo does not exist`
- ✅ **DEPOIS**: APIs funcionando normalmente

## 📊 Resultado Esperado

Após a migration:

```sql
-- Estrutura da tabela Motorista
CREATE TABLE "Motorista" (
  id               TEXT PRIMARY KEY,
  dataCriacao      TIMESTAMP DEFAULT NOW(),
  nome             TEXT NOT NULL,
  telefone         TEXT NOT NULL,
  cpf              TEXT UNIQUE NOT NULL,
  cnh              TEXT,
  transportadoraId "Transportadora" NOT NULL,
  tipo             "TipoPessoa" DEFAULT 'MOTORISTA' NOT NULL  -- ← NOVO CAMPO
);

-- Enum TipoPessoa
CREATE TYPE "TipoPessoa" AS ENUM (
  'MOTORISTA',
  'FUNCIONARIO',
  'CLIENTE'
);
```

## ⚠️ Importante

- **Não há perda de dados**: A migration apenas adiciona uma coluna
- **Todos os motoristas existentes** terão `tipo = 'MOTORISTA'` automaticamente
- **Idempotente**: Pode ser executada múltiplas vezes sem problemas
- **Reversível**: Se necessário, pode ser revertida com `ALTER TABLE "Motorista" DROP COLUMN "tipo"`

## 🆘 Problemas?

Se encontrar algum erro:

1. **Erro de permissão**: Use um usuário com permissões de administrador
2. **Enum já existe**: Normal, o script trata isso automaticamente
3. **Coluna já existe**: Normal, o script trata isso automaticamente

## ✅ Checklist

Após executar a migration:

- [ ] SQL executado sem erros
- [ ] Coluna `tipo` existe na tabela `Motorista`
- [ ] Enum `TipoPessoa` criado
- [ ] Todos os motoristas têm `tipo = 'MOTORISTA'`
- [ ] API `/api/motoristas` retorna 200
- [ ] API `/api/pessoas` retorna 200
- [ ] API `/api/pessoas/para-controles` retorna 200
- [ ] Aplicação funcionando normalmente

## 📞 Contato

Se precisar de ajuda, forneça:
- Qual opção você tentou executar
- Mensagem de erro completa (se houver)
- Print do resultado da query de verificação
