# 🚨 MIGRAÇÃO URGENTE PARA PRODUÇÃO

## ⚠️ **PROBLEMA ATUAL:**
- Deploy foi bem-sucedido, mas banco de produção não tem campo `tipo` na tabela `Motorista`
- Enum `Transportadora` não tem valores `ACCERT` e `RETIRA_CLIENTE`
- APIs estão falhando com erros P2022 (coluna não existe)

## 🎯 **SOLUÇÕES DISPONÍVEIS:**

### **OPÇÃO 1: Execução Automática via Script**
```bash
# No terminal local (com DATABASE_URL de produção configurada)
node scripts/executar-migracao-producao.js
```

### **OPÇÃO 2: SQL Manual no Painel do Banco**
1. Acesse o painel do seu provedor de banco (Neon, Supabase, etc.)
2. Execute o conteúdo do arquivo `scripts/MIGRAR_PRODUCAO_URGENTE.sql`

### **OPÇÃO 3: Via Vercel CLI**
```bash
# Se tiver Vercel CLI configurado
vercel env pull .env.production
DATABASE_URL=$(cat .env.production | grep DATABASE_URL | cut -d '=' -f2-) node scripts/executar-migracao-producao.js
```

## 📋 **O QUE A MIGRAÇÃO FAZ:**

### ✅ **Alterações Seguras:**
1. **Adiciona campo `tipo`** na tabela `Motorista` (padrão: MOTORISTA)
2. **Torna CNH opcional** (funcionários/clientes não precisam)
3. **Adiciona ACCERT** ao enum Transportadora
4. **Adiciona RETIRA_CLIENTE** ao enum Transportadora
5. **Migra dados ACERT → ACCERT** (corrige inconsistência)

### 🔒 **Garantias de Segurança:**
- ✅ **Nenhum dado será perdido**
- ✅ **Verificações antes de cada alteração**
- ✅ **Valores padrão para novos campos**
- ✅ **Operações idempotentes** (pode executar múltiplas vezes)

## 🧪 **TESTE APÓS MIGRAÇÃO:**

### **Verificar se funcionou:**
1. Acesse: https://gestao-logistica-3ziqm0vha-esplendor-projetos-projects.vercel.app/admin/motoristas
2. Deve carregar sem erro 500
3. Teste criar controle: https://gestao-logistica-3ziqm0vha-esplendor-projetos-projects.vercel.app/criar-controle

### **APIs que devem funcionar:**
- ✅ `/api/motoristas` - Listar motoristas
- ✅ `/api/pessoas` - Listar pessoas  
- ✅ `/api/pessoas/para-controles` - Dropdown criar controle
- ✅ `/api/controles` - Criar/listar controles

## 🚀 **APÓS A MIGRAÇÃO:**

### **Funcionalidades que voltarão a funcionar:**
1. **Página de motoristas** - Sem erro 500
2. **Criar controles** - Dropdown de pessoas funcionando
3. **Funcionários e clientes** - Páginas acessíveis
4. **Transportadoras corretas** - ACCERT e RETIRA_CLIENTE

### **Dados esperados após migração:**
- **Motoristas existentes** → `tipo: 'MOTORISTA'`
- **Transportadoras ACERT** → Migradas para `ACCERT`
- **Enum atualizado** → Inclui ACCERT e RETIRA_CLIENTE

## 📞 **SE ALGO DER ERRADO:**

### **Rollback de emergência:**
```sql
-- Se precisar reverter (CUIDADO!)
ALTER TABLE "Motorista" DROP COLUMN IF EXISTS "tipo";
DROP TYPE IF EXISTS "TipoPessoa";
```

### **Logs para debug:**
- Verifique logs do Vercel: https://vercel.com/dashboard
- Procure por erros P2022 (coluna não existe)
- Procure por "Invalid enum value" (enum desatualizado)

## ⏰ **URGÊNCIA:**
Esta migração deve ser executada **IMEDIATAMENTE** para restaurar o funcionamento da aplicação em produção.

**Status atual:** 🔴 Aplicação com erros críticos
**Status após migração:** 🟢 Aplicação totalmente funcional
