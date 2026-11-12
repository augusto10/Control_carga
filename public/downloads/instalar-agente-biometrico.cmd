@echo off
setlocal
title Instalador do Agente Biometrico ControlCarga

set "INSTALLER_URL=https://raw.githubusercontent.com/augusto10/Control_carga/feature/implantacao-biometria/public/downloads/install-biometric-agent.ps1"
set "INSTALLER_FILE=%TEMP%\install-biometric-agent.ps1"

echo Baixando o instalador do agente biometrico...
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -UseBasicParsing -Uri '%INSTALLER_URL%' -OutFile '%INSTALLER_FILE%'"
if errorlevel 1 goto :error

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%INSTALLER_FILE%"
if errorlevel 1 goto :error

del /q "%INSTALLER_FILE%" >nul 2>&1
echo.
echo Instalacao concluida. Pressione qualquer tecla para fechar.
pause >nul
exit /b 0

:error
echo.
echo Nao foi possivel concluir a instalacao.
echo Leia a mensagem acima, confirme a internet e tente novamente.
pause
exit /b 1
