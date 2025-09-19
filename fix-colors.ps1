# Script para corrigir as cores do menu
$filePath = "components\Layout.tsx"
$content = Get-Content $filePath -Raw

# Substituir cores escuras por cores claras
$content = $content -replace '#1a1a1a', '#1e293b'
$content = $content -replace '#ff6b35', '#ff8c42'

# Salvar o arquivo
Set-Content $filePath $content -NoNewline

Write-Host "Cores do menu corrigidas com sucesso!" -ForegroundColor Green
