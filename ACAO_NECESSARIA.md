# ⚠️ AÇÃO NECESSÁRIA - Migration Manual

## 🔴 Situação Atual

O deploy na Vercel foi **concluído com sucesso**, mas as APIs estão retornando erro 500:

```
❌ /api/motoristas - Erro 500
❌ /api/pessoas - Erro 500  
❌ /api/pessoas/para-controles - Erro 500

Erro: The column `Motorista.tipo` does not exist in the current database
```

## 🎯 Solução

Você precisa **executar uma migration SQL manualmente** no banco de dados.

## 📋 Passo a Passo

### **1. Acessar o Painel do Banco de Dados**

- **Neon**: https://console.neon.tech
- **Supabase**: https://app.supabase.com
- Ou qualquer outro painel que você use

### **2. Abrir o SQL Editor**

- Procure por "SQL Editor", "Query", ou similar
- Abra um novo editor de SQL

### **3. Copiar e Executar este SQL:**

```sql
-- Migration: Adicionar campo 'tipo' na tabela Motorista
-- Copie TUDO e execute de uma vez

DO $$ BEGIN
    CREATE TYPE "TipoPessoa" AS ENUM ('MOTORISTA', 'FUNCIONARIO', 'CLIENTE');
EXCEPTION
    WHEN duplicate_object THEN 
        RAISE NOTICE 'Enum já existe';
END $$;

DO $$ BEGIN
    ALTER TABLE "Motorista" 
    ADD COLUMN "tipo" "TipoPessoa" DEFAULT 'MOTORISTA' NOT NULL;
    
    RAISE NOTICE 'Coluna adicionada!';
EXCEPTION
    WHEN duplicate_column THEN 
        RAISE NOTICE 'Coluna já existe';
END $$;

UPDATE "Motorista" 
SET "tipo" = 'MOTORISTA' 
WHERE "tipo" IS NULL;

SELECT '✅ Migration concluída!' as status;
```

### **4. Verificar se Funcionou**

Execute este SQL para verificar:

```sql
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'Motorista' 
AND column_name = 'tipo';
```

**Resultado esperado:**
```
column_name | data_type
------------+-----------
tipo        | USER-DEFINED
```

### **5. Testar a Aplicação**

Acesse a aplicação em produção e teste:

- ✅ Página de motoristas deve carregar
- ✅ Criar controle deve funcionar
- ✅ Não deve mais aparecer erro 500

## 📚 Documentação Completa

Para mais detalhes, veja:
- **EXECUTAR_MIGRATION_MANUAL.md** - Guia completo com todas as opções
- **MIGRATION_TIPO_MOTORISTA.md** - Contexto técnico do problema

## ✅ Checklist

- [ ] Acessei o painel do banco de dados
- [ ] Abri o SQL Editor
- [ ] Executei o SQL da migration
- [ ] Verifiquei que a coluna `tipo` foi criada
- [ ] Testei a aplicação em produção
- [ ] APIs estão funcionando (200 ao invés de 500)

## 🆘 Precisa de Ajuda?

Se encontrar algum problema:

1. Tire um print da tela do erro
2. Copie a mensagem de erro completa
3. Me envie para análise

## ⏱️ Tempo Estimado

- **2-5 minutos** para executar a migration
- **Imediato** - APIs voltam a funcionar assim que executar

---

**Status**: ⚠️ Aguardando execução manual da migration
