#!/bin/bash

# Script para remover arquivos de teste do git antes do deploy

echo "🧹 Limpando arquivos de teste do repositório git..."

# Remover arquivos de teste do índice do git
echo "Removendo test-*.js e test-*.ts..."
git rm --cached test-*.js test-*.ts 2>/dev/null || true

echo "Removendo create-test-*.js..."
git rm --cached create-test-*.js 2>/dev/null || true

echo "Removendo scripts/teste-*.ts..."
git rm --cached scripts/teste-*.ts 2>/dev/null || true

echo "Removendo scripts/test-*.js..."
git rm --cached scripts/test-*.js 2>/dev/null || true

echo "Removendo scripts/test-*.ts..."
git rm --cached scripts/test-*.ts 2>/dev/null || true

echo "Removendo components/*Test*.tsx..."
git rm --cached components/*Test*.tsx 2>/dev/null || true

echo "Removendo pages/teste-*.tsx..."
git rm --cached pages/teste-*.tsx 2>/dev/null || true

echo "Removendo prisma/test-*.sql..."
git rm --cached prisma/test-*.sql 2>/dev/null || true

echo ""
echo "✅ Limpeza concluída!"
echo ""
echo "📊 Status do repositório:"
git status

echo ""
echo "📝 Próximos passos:"
echo "1. Revisar as mudanças com: git status"
echo "2. Fazer commit com: git commit -m 'chore: remover arquivos de teste'"
echo "3. Fazer push com: git push origin main"
