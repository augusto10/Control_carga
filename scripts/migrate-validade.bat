@echo off
echo 🔄 Executando migração para campos de validade...

echo.
echo 📋 1. Executando migração SQL...
psql %DATABASE_URL% -f "prisma/migrations/add_validade_fields/migration.sql"

echo.
echo 🔧 2. Gerando cliente Prisma...
npx prisma generate

echo.
echo ✅ Migração concluída!
echo.
echo 📊 Os novos campos estão disponíveis para relatórios:
echo   - alertaValidadeAutorizado (Boolean)
echo   - nomeAutorizadorLider (String)
echo   - produtosComAlertaValidade (JSON String)
echo.
pause
