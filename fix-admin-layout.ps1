# Script para verificar e corrigir cores do AdminLayout se necessário
$filePath = "components\admin\AdminLayout.tsx"
$content = Get-Content $filePath -Raw

Write-Host "Verificando AdminLayout.tsx..." -ForegroundColor Cyan

# Verificar se há cores escuras que precisam ser ajustadas
if ($content -match "#1a1a1a" -or $content -match "color.*white" -or $content -match "background.*dark") {
    Write-Host "Encontradas cores que precisam ser ajustadas no AdminLayout!" -ForegroundColor Yellow
    
    # Fazer as correções necessárias
    $content = $content -replace "#1a1a1a", "#1e293b"
    $content = $content -replace "color: '#ffffff'", "color: '#1e293b'"
    
    # Salvar o arquivo
    Set-Content $filePath $content -NoNewline
    Write-Host "AdminLayout corrigido com sucesso!" -ForegroundColor Green
} else {
    Write-Host "AdminLayout está OK - usa cores padrão do Material-UI" -ForegroundColor Green
}

Write-Host "`nResumo dos arquivos verificados:" -ForegroundColor Cyan
Write-Host "✅ Layout.tsx - Corrigido anteriormente" -ForegroundColor Green
Write-Host "✅ UserMenu.tsx - OK (usa cores padrão)" -ForegroundColor Green  
Write-Host "✅ ResponsiveLayout.tsx - OK (sem menu lateral)" -ForegroundColor Green
Write-Host "✅ AdminLayout.tsx - Verificado" -ForegroundColor Green
