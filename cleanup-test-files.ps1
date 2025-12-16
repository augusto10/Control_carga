# Script PowerShell para remover arquivos de teste do git antes do deploy

Write-Host "🧹 Limpando arquivos de teste do repositório git..." -ForegroundColor Cyan
Write-Host ""

# Função auxiliar para remover arquivos
function Remove-GitCachedFiles {
    param(
        [string]$Pattern,
        [string]$Description
    )
    
    Write-Host "Removendo $Description..." -ForegroundColor Yellow
    $files = git ls-files | Where-Object { $_ -like $Pattern }
    
    if ($files) {
        $files | ForEach-Object {
            git rm --cached $_ 2>$null
        }
        Write-Host "✅ Removidos: $($files.Count) arquivo(s)" -ForegroundColor Green
    } else {
        Write-Host "⏭️  Nenhum arquivo encontrado" -ForegroundColor Gray
    }
    Write-Host ""
}

# Remover diferentes padrões de arquivos de teste
Remove-GitCachedFiles "test-*.js" "test-*.js"
Remove-GitCachedFiles "test-*.ts" "test-*.ts"
Remove-GitCachedFiles "create-test-*.js" "create-test-*.js"
Remove-GitCachedFiles "scripts/teste-*.ts" "scripts/teste-*.ts"
Remove-GitCachedFiles "scripts/test-*.js" "scripts/test-*.js"
Remove-GitCachedFiles "scripts/test-*.ts" "scripts/test-*.ts"
Remove-GitCachedFiles "components/*Test*.tsx" "components/*Test*.tsx"
Remove-GitCachedFiles "pages/teste-*.tsx" "pages/teste-*.tsx"
Remove-GitCachedFiles "prisma/test-*.sql" "prisma/test-*.sql"

Write-Host ""
Write-Host "✅ Limpeza concluída!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Status do repositório:" -ForegroundColor Cyan
git status

Write-Host ""
Write-Host "📝 Próximos passos:" -ForegroundColor Cyan
Write-Host "1. Revisar as mudanças com: git status" -ForegroundColor White
Write-Host "2. Fazer commit com: git commit -m 'chore: remover arquivos de teste'" -ForegroundColor White
Write-Host "3. Fazer push com: git push origin main" -ForegroundColor White
