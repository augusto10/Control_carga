#!/usr/bin/env pwsh

# Remove node_modules e package-lock.json
if (Test-Path node_modules) {
    Remove-Item -Recurse -Force node_modules
}
if (Test-Path package-lock.json) {
    Remove-Item package-lock.json
}

# Limpa o cache do npm
npm cache clean --force

# Instala as dependências
echo "Instalando dependências..."
npm install

# Gera o cliente Prisma
echo "Gerando cliente Prisma..."
npx prisma generate
