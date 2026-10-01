@echo off
echo 🔄 Aplicando migração para campos de validade via Prisma...

echo.
echo 📋 1. Aplicando migração...
npx prisma db push

echo.
echo 🔧 2. Gerando cliente Prisma...
npx prisma generate

echo.
echo ✅ Migração concluída via Prisma!
echo.
echo 📊 Os novos campos estão disponíveis:
echo   - alertaValidadeAutorizado: Boolean (padrão false)
echo   - nomeAutorizadorLider: String opcional
echo   - produtosComAlertaValidade: String JSON opcional
echo.
echo 🎯 Agora os alertas de validade serão salvos no banco para relatórios!
echo.
pause
