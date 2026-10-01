# Migration: Campo `tipo` na Tabela Motorista

## 🔥 Problema Identificado

Após o deploy na Vercel, as APIs estavam retornando erro:

```
The column `Motorista.tipo` does not exist in the current database
Code: P2022
```

### Causa Raiz

- **Código local**: Usa o campo `tipo` na tabela `Motorista` (adicionado recentemente)
- **Banco de produção**: Não tem a coluna `tipo` (estrutura antiga)

### APIs Afetadas

- `/api/motoristas` - Erro 500
- `/api/pessoas` - Erro 500  
- `/api/pessoas/para-controles` - Erro 500

## ✅ Solução Implementada

### 1. Migration Automática no Build

Atualizado `scripts/vercel-postbuild.js` para:

1. **Verificar** se a coluna `tipo` existe
2. **Criar** o enum `TipoPessoa` se não existir
3. **Adicionar** a coluna `tipo` com valor padrão `MOTORISTA`
4. **Validar** que tudo funcionou

### 2. Script SQL Manual (Backup)

Criado `scripts/sql/add-tipo-motorista.sql` para executar manualmente se necessário.

### 3. Script Node.js (Alternativa)

Criado `scripts/add-tipo-motorista.js` para executar localmente:

```bash
node scripts/add-tipo-motorista.js
```

## 🚀 Próximo Deploy

No próximo deploy, o script `vercel-postbuild.js` vai:

1. ✅ Detectar que a coluna `tipo` não existe
2. ✅ Criar o enum `TipoPessoa`
3. ✅ Adicionar a coluna `tipo` com valor padrão `MOTORISTA`
4. ✅ Todos os motoristas existentes terão `tipo = 'MOTORISTA'`
5. ✅ APIs voltarão a funcionar normalmente

## 📊 Estrutura Final

```sql
-- Enum
CREATE TYPE "TipoPessoa" AS ENUM ('MOTORISTA', 'FUNCIONARIO', 'CLIENTE');

-- Tabela Motorista
ALTER TABLE "Motorista" 
ADD COLUMN "tipo" "TipoPessoa" DEFAULT 'MOTORISTA' NOT NULL;
```

## 🧪 Validação

Após o deploy, verificar:

1. ✅ `/api/motoristas` retorna 200
2. ✅ `/api/pessoas` retorna 200
3. ✅ `/api/pessoas/para-controles` retorna 200
4. ✅ Todos os motoristas têm `tipo = 'MOTORISTA'`

## 📝 Notas

- A migration é **idempotente** (pode ser executada múltiplas vezes sem problemas)
- Todos os motoristas existentes serão marcados como `tipo = 'MOTORISTA'`
- Não há perda de dados
- A migration é executada automaticamente no build da Vercel

## 🔧 Execução Manual (Se Necessário)

Se por algum motivo a migration automática falhar, execute manualmente:

### Opção 1: Via Prisma Studio ou Cliente SQL

```sql
-- Copiar e colar o conteúdo de scripts/sql/add-tipo-motorista.sql
```

### Opção 2: Via Script Node.js

```bash
# Configurar DATABASE_URL no .env
node scripts/add-tipo-motorista.js
```

## ✅ Status

- **Commit**: `4b66a75` - "feat: adicionar migration automática do campo tipo na tabela Motorista"
- **Branch**: `feature/assinaturas-melhoradas`
- **Deploy**: Aguardando próximo deploy automático da Vercel
- **Previsão**: Migration será executada automaticamente no próximo build
