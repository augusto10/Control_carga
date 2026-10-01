#!/bin/bash
echo "🔄 Revertendo sistema de materiais para versão anterior..."

# 1. Remover arquivos criados para o sistema de materiais
echo "🗑️ Removendo arquivos criados..."

# Remover API de solicitações
rm -rf pages/api/solicitacoes-material/

# Remover páginas de materiais
rm -rf pages/materiais/

# Remover scripts de verificação criados
rm -f verificar-tabelas-materiais.js
rm -f verificar-colunas-solicitacao.js
rm -f executar-migracao-solicitacoes.js
rm -f MIGRACAO_SOLICITACOES_SEGURA.sql

# 2. Reverter mudanças no schema Prisma
echo "🔄 Revertendo schema Prisma..."
git checkout HEAD~1 -- prisma/schema.prisma 2>/dev/null || echo "Schema já está correto"

# 3. Limpar cache do Next.js e Prisma
echo "🧹 Limpando cache..."
rm -rf .next/
rm -rf node_modules/.prisma/

# 4. Regenerar cliente Prisma
echo "🔄 Regenerando cliente Prisma..."
npx prisma generate

echo "✅ Sistema de materiais revertido com sucesso!"
echo ""
echo "🎯 PRÓXIMOS PASSOS:"
echo "1. Reinicie o servidor: npm run dev"
echo "2. Teste a aplicação"
echo "3. Faça commit das mudanças: git add -A && git commit -m 'Revert: Remove sistema de materiais'"
