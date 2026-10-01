# Script para corrigir as cores do hover no menu
$filePath = "components\Layout.tsx"
$content = Get-Content $filePath -Raw

# Corrigir cor do texto no hover - de branco para preto
$content = $content -replace "color: '#ffffff',\s*fontWeight: 500,", "color: '#1e293b', fontWeight: 500,"

# Corrigir cor do texto no hover dos submenus também
$content = $content -replace "color: '#e0e0e0',", "color: '#1e293b',"
$content = $content -replace "color: '#475569',", "color: '#1e293b',"

# Salvar o arquivo
Set-Content $filePath $content -NoNewline

Write-Host "Cores do hover corrigidas com sucesso!" -ForegroundColor Green
Write-Host "Agora o texto ficará preto no hover para melhor visibilidade!" -ForegroundColor Yellow
