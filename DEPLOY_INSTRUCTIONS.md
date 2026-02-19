# 📋 Instruções para Deploy no Vercel

## ✅ Pré-requisitos
- Git configurado com acesso ao repositório remoto
- Vercel CLI instalado (opcional, mas recomendado)
- Banco de dados PostgreSQL em produção configurado

## 🚀 Passo 1: Remover Arquivos de Teste do Git

Execute os seguintes comandos no terminal:

```bash
# Remover arquivos de teste do índice do git (sem deletar localmente)
git rm --cached test-*.js test-*.ts 2>/dev/null || true
git rm --cached create-test-*.js 2>/dev/null || true
git rm --cached scripts/teste-*.ts 2>/dev/null || true
git rm --cached scripts/test-*.js 2>/dev/null || true
git rm --cached scripts/test-*.ts 2>/dev/null || true
git rm --cached components/*Test*.tsx 2>/dev/null || true
git rm --cached pages/teste-*.tsx 2>/dev/null || true
git rm --cached prisma/test-*.sql 2>/dev/null || true

# Verificar status
git status
```

## 🔧 Passo 2: Configurar .env para Produção

Antes de fazer push, certifique-se de que:

1. **Não commitar .env** - O arquivo `.env` está no `.gitignore` (correto ✅)
2. **Variáveis de ambiente no Vercel** - Configure as variáveis no painel do Vercel:
   - `DATABASE_URL` - URL do banco PostgreSQL em produção
   - `JWT_SECRET` - Segredo JWT (mesmo da produção)
   - `NEXTAUTH_SECRET` - Secret do NextAuth
   - Outras variáveis necessárias

## 📤 Passo 3: Fazer Commit e Push

```bash
# Adicionar alterações
git add .gitignore

# Commit
git commit -m "chore: atualizar .gitignore para excluir arquivos de teste"

# Push para remoto
git push origin main  # ou a branch que você usa
```

## 🔄 Passo 4: Deploy no Vercel

### Opção A: Via Dashboard Vercel
1. Acesse https://vercel.com/dashboard
2. Selecione o projeto
3. Clique em "Deploy" ou aguarde deploy automático

### Opção B: Via Vercel CLI
```bash
vercel deploy --prod
```

## 🗄️ Passo 5: Executar Migration no Banco de Produção

Após o deploy ser bem-sucedido:

```bash
# Opção 1: Via Vercel CLI
vercel env pull .env.production.local
npx prisma migrate deploy --skip-generate

# Opção 2: Conectar diretamente ao banco de produção
# Alterar DATABASE_URL no .env para apontar para produção
# Depois executar:
npx prisma migrate deploy
```

## ⚠️ Importante: Segurança de Dados

✅ **Nenhum dado será perdido porque:**
- Prisma migrations são idempotentes (seguras para executar múltiplas vezes)
- Apenas adicionam novas colunas/tabelas, não deletam dados existentes
- Backup automático do banco antes de migrations é recomendado

## 🔍 Verificação Pós-Deploy

1. Acesse a URL do Vercel
2. Teste login com credenciais de produção
3. Verifique se impressoras estão funcionando
4. Teste geração de etiquetas
5. Teste exclusão de controles

## 📞 Suporte

Se encontrar erros:
1. Verifique logs no Vercel: `vercel logs`
2. Verifique variáveis de ambiente
3. Verifique conexão com banco de dados
4. Verifique JWT_SECRET é igual em dev e prod

## ✨ Mudanças Incluídas Neste Deploy

- ✅ Impressão de etiquetas com código de barras escaneável
- ✅ Seleção de impressora nativa do navegador
- ✅ Correção de token inválido ao excluir controles
- ✅ Remoção de arquivos de teste do repositório
- ✅ Adição de jsbarcode para códigos de barras reais
