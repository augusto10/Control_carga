# 🚨 CORREÇÃO URGENTE: Problemas no Banco de Produção

## ❌ Problemas Identificados nos Logs:

1. **Coluna `tipo` ausente**: `The column 'Motorista.tipo' does not exist in the current database`
2. **Enum Transportadora incorreto**: `Value 'ACERT' not found in enum 'Transportadora'`
3. **Dados inconsistentes**: Controles usando `ACERT` ao invés de `ACCERT`

## ✅ Solução Implementada:

### Opção 1: SQL Manual (Recomendada)
Execute este SQL diretamente no seu banco PostgreSQL de produção:

```sql
-- scripts/sql/sync-production-database.sql

-- 1. Adicionar coluna 'tipo' na tabela Motorista
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'Motorista' AND column_name = 'tipo') THEN
        ALTER TABLE "Motorista" ADD COLUMN "tipo" TEXT DEFAULT 'MOTORISTA';
        RAISE NOTICE 'Coluna tipo adicionada à tabela Motorista';
    ELSE
        RAISE NOTICE 'Coluna tipo já existe na tabela Motorista';
    END IF;
END $$;

-- 2. Atualizar dados existentes para usar ACCERT
UPDATE "ControleCarga" SET transportadora = 'ACCERT' WHERE transportadora = 'ACERT';
UPDATE "Motorista" SET "transportadoraId" = 'ACCERT' WHERE "transportadoraId" = 'ACERT';

-- 3. Definir tipo padrão para motoristas existentes
UPDATE "Motorista" SET tipo = 'MOTORISTA' WHERE tipo IS NULL OR tipo = '';
```

### Opção 2: Script TypeScript (Se houver acesso direto)
```bash
npx ts-node scripts/sync-production-db.ts
```

## 🔧 Após Aplicar as Correções:

### 1. Deploy das Correções de Código:
```bash
git add .
git commit -m "fix: corrigir problemas de sincronização do banco de produção"
git push origin main
```

### 2. O Vercel fará automaticamente:
- ✅ Build da aplicação com correções
- ✅ Deploy das APIs atualizadas
- ✅ Aplicação funcionando normalmente

## 📊 Status Esperado Após Correção:

### ✅ APIs que estavam falhando devem funcionar:
- `/api/pessoas` - ✅ Buscar pessoas por tipo
- `/api/motoristas` - ✅ Listar motoristas
- `/api/controles` - ✅ Criar controles com ACCERT/RETIRA_CLIENTE
- `/api/notas` - ✅ Listar notas (corrigido enum)

### ✅ Funcionalidades restauradas:
- **Criação de controles** com transportadoras corretas
- **Listagem de motoristas** filtrada por tipo
- **Dropdown de pessoas** agrupado por tipo
- **Relatórios** funcionando normalmente

## 🚨 Importante:

1. **Faça backup** do banco antes de executar qualquer alteração
2. **Execute primeiro em ambiente de teste** se possível
3. **Monitore os logs** após o deploy para confirmar que tudo funciona

## 🎯 Próximos Passos:

1. ✅ Aplicar correções no banco (você)
2. ✅ Deploy das correções de código (você)
3. ✅ Testar aplicação em produção (você)
4. ✅ Confirmar que todos os erros foram resolvidos

**Status Atual:** 🔄 Aguardando aplicação das correções no banco de produção
