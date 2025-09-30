# 🚨 CORREÇÃO URGENTE - ERROS NO VERCEL

## 📊 Problemas Identificados

1. **Campo `tipo` não existe na tabela Motorista**
   - Erro: `The column Motorista.tipo does not exist in the current database`
   - Status: CRÍTICO ❌

2. **Valor 'ACERT' inválido no enum Transportadora**
   - Erro: `Value 'ACERT' not found in enum 'Transportadora'`
   - Status: CRÍTICO ❌

## 🔧 SOLUÇÃO IMEDIATA

### Passo 1: Acessar o Banco de Dados
- Acesse o painel do seu provedor de banco (Supabase, PlanetScale, Neon, etc.)
- Vá para a seção de Query/SQL Editor

### Passo 2: Executar SQLs de Correção

```sql
-- 1. Adicionar campo tipo (se não existir)
ALTER TABLE "Motorista" ADD COLUMN IF NOT EXISTS tipo TEXT;

-- 2. Definir valores padrão baseado na CNH
UPDATE "Motorista" 
SET tipo = CASE 
    WHEN cnh IS NOT NULL AND cnh != '' THEN 'MOTORISTA'
    WHEN "transportadoraId" = 'RETIRA_CLIENTE' THEN 'CLIENTE'
    WHEN "transportadoraId" = 'RETIRA_VENDEDOR' THEN 'FUNCIONARIO'
    ELSE 'MOTORISTA'
END
WHERE tipo IS NULL;

-- 3. Tornar campo obrigatório
ALTER TABLE "Motorista" ALTER COLUMN tipo SET NOT NULL;

-- 4. Corrigir ACERT para ACCERT em todas as tabelas
UPDATE "ControleCarga" SET transportadora = 'ACCERT' WHERE transportadora = 'ACERT';
UPDATE "NotaFiscal" SET transportadora = 'ACCERT' WHERE transportadora = 'ACERT';
UPDATE "Motorista" SET "transportadoraId" = 'ACCERT' WHERE "transportadoraId" = 'ACERT';
```

### Passo 3: Verificar Correções

```sql
-- Verificar se campo tipo existe
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'Motorista' AND column_name = 'tipo';

-- Verificar distribuição por tipo
SELECT tipo, COUNT(*) FROM "Motorista" GROUP BY tipo;

-- Verificar se não há mais ACERT (deve retornar 0)
SELECT COUNT(*) FROM "ControleCarga" WHERE transportadora = 'ACERT';
SELECT COUNT(*) FROM "NotaFiscal" WHERE transportadora = 'ACERT';
SELECT COUNT(*) FROM "Motorista" WHERE "transportadoraId" = 'ACERT';
```

### Passo 4: Forçar Redeploy no Vercel
1. Acesse o painel do Vercel
2. Vá no projeto "gestao-logistica"
3. Clique em "Redeploy" no último deploy
4. Aguarde o deploy completar (3-5 minutos)

## ⏱️ Tempo Estimado
- **Execução dos SQLs**: 2-5 minutos
- **Redeploy no Vercel**: 3-5 minutos
- **Total**: ~10 minutos

## ✅ Como Saber se Funcionou
- APIs retornando status **200** ao invés de **500**
- Sem erros nos logs do Vercel
- Sistema carregando normalmente
- Pessoas aparecendo nos dropdowns

## 🆘 Se Ainda Não Funcionar

1. **Verificar variáveis de ambiente no Vercel:**
   - `DATABASE_URL` está correta?
   - `NEXTAUTH_SECRET` está definida?
   - `NEXTAUTH_URL` está correta?

2. **Limpar cache:**
   - No Vercel, vá em Settings > Functions
   - Clique em "Clear Cache"

3. **Verificar logs em tempo real:**
   - No Vercel, vá em Functions
   - Clique em "View Function Logs"

## 📞 Comandos Alternativos (se tiver acesso local ao banco)

```bash
# Executar scripts SQL diretamente
psql $DATABASE_URL -f scripts/add-tipo-campo.sql
psql $DATABASE_URL -f scripts/fix-acert-para-accert.sql

# Ou usar os scripts Node.js
node scripts/fix-producao-urgente.js
```

## 🎯 Após a Correção

1. Testar login no sistema
2. Verificar se motoristas aparecem em `/admin/motoristas`
3. Testar criação de controles
4. Verificar relatórios
5. Confirmar que não há mais erros 500

---

## 🚀 EXECUTE AGORA!

**A ordem é importante:**
1. ✅ Executar SQLs no banco
2. ✅ Verificar correções
3. ✅ Fazer redeploy no Vercel
4. ✅ Testar o sistema

**Status atual**: Sistema FORA DO AR ❌  
**Após correção**: Sistema FUNCIONANDO ✅
