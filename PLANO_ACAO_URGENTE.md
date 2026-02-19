# 🚨 PLANO DE AÇÃO URGENTE - PRODUÇÃO

## 📊 **STATUS ATUAL:**
- ✅ **Deploy**: Bem-sucedido (build OK)
- ❌ **Banco**: Desatualizado (falta campo `tipo`)
- ❌ **APIs**: Falhando com erro P2022
- ❌ **Aplicação**: Não funcional em produção

## 🎯 **OBJETIVO:**
Restaurar funcionamento completo da aplicação em produção **IMEDIATAMENTE**.

## 🚀 **PLANO DE EXECUÇÃO:**

### **FASE 1: CORREÇÃO IMEDIATA (5 minutos)**

#### **Opção A: Migração Automática**
```bash
# Execute no terminal local:
node scripts/executar-migracao-producao.js
```

#### **Opção B: SQL Manual**
1. Acesse painel do banco (Neon/Supabase)
2. Execute conteúdo de: `scripts/MIGRAR_PRODUCAO_URGENTE.sql`

### **FASE 2: VERIFICAÇÃO (2 minutos)**

#### **Teste as URLs:**
- https://gestao-logistica-3ziqm0vha-esplendor-projetos-projects.vercel.app/admin/motoristas
- https://gestao-logistica-3ziqm0vha-esplendor-projetos-projects.vercel.app/criar-controle

#### **Deve funcionar:**
- ✅ Página de motoristas carrega
- ✅ Dropdown de pessoas funciona
- ✅ Sem erros 500 nos logs

### **FASE 3: FALLBACK SE MIGRAÇÃO FALHAR (10 minutos)**

#### **Ativar APIs temporárias:**
```bash
# Ativar compatibilidade temporária
node scripts/ativar-apis-temporarias.js

# Fazer novo deploy
git add .
git commit -m "fix: ativar APIs temporárias para compatibilidade"
git push origin feature/assinaturas-melhoradas
```

#### **Aguardar deploy e testar novamente**

## 📋 **CHECKLIST DE EXECUÇÃO:**

### **☐ PASSO 1: Tentar migração automática**
```bash
node scripts/executar-migracao-producao.js
```

### **☐ PASSO 2: Se falhar, SQL manual**
- Copiar conteúdo de `MIGRAR_PRODUCAO_URGENTE.sql`
- Executar no painel do banco

### **☐ PASSO 3: Verificar funcionamento**
- Testar URLs principais
- Verificar logs do Vercel

### **☐ PASSO 4: Se ainda falhar, ativar fallback**
```bash
node scripts/ativar-apis-temporarias.js
git add . && git commit -m "fix: APIs temporárias" && git push
```

### **☐ PASSO 5: Após tudo funcionar**
```bash
# Se usou APIs temporárias, restaurar após migração
node scripts/restaurar-apis-originais.js
git add . && git commit -m "fix: restaurar APIs após migração" && git push
```

## 🔍 **DIAGNÓSTICO DE PROBLEMAS:**

### **Erro: "column 'tipo' does not exist"**
- **Causa**: Migração não executada
- **Solução**: Executar migração SQL

### **Erro: "Value 'ACERT' not found in enum"**
- **Causa**: Enum desatualizado
- **Solução**: Migração adiciona ACCERT ao enum

### **Erro: "Cannot connect to database"**
- **Causa**: URL de conexão incorreta
- **Solução**: Verificar DATABASE_URL no Vercel

## 📞 **CONTATOS DE EMERGÊNCIA:**

### **Se nada funcionar:**
1. **Rollback**: Reverter para commit anterior
2. **Suporte**: Contatar equipe de DevOps
3. **Banco**: Acessar painel do provedor diretamente

## ⏰ **TEMPO ESTIMADO:**
- **Migração automática**: 2-5 minutos
- **SQL manual**: 5-10 minutos  
- **Fallback temporário**: 10-15 minutos
- **Verificação completa**: 5 minutos

## 🎯 **RESULTADO ESPERADO:**
- ✅ Aplicação funcionando 100%
- ✅ Todas as páginas acessíveis
- ✅ APIs respondendo corretamente
- ✅ Sem erros 500 nos logs
- ✅ Funcionalidades de motoristas/pessoas operacionais

---

**🚨 EXECUTE IMEDIATAMENTE - APLICAÇÃO FORA DO AR**
