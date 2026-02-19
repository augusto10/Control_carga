# Script para corrigir imports de lib/prisma em todos os arquivos da API

$apiPath = "c:\Users\Apps\Documents\controle_carga\Control_carga\pages\api"
$files = Get-ChildItem -Path $apiPath -Recurse -Filter "*.ts" -Exclude "*.original.ts", "*-temp.ts"

$count = 0
foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -Raw
    
    # Detectar o número de níveis de profundidade
    $relativePath = $file.FullName.Replace($apiPath, "").TrimStart("\")
    $depth = ($relativePath.Split("\").Count - 1)
    
    # Criar o prefixo correto baseado na profundidade
    $prefix = "../" * ($depth + 1)
    
    # Padrões a substituir
    $patterns = @(
        @{ old = 'from [''"]\.\.\/\.\.\/\.\.\/lib\/prisma[''"]'; new = "from '${prefix}lib/prisma'" },
        @{ old = 'from [''"]\.\.\/\.\.\/lib\/prisma[''"]'; new = "from '${prefix}lib/prisma'" },
        @{ old = 'from [''"]\.\.\/lib\/prisma[''"]'; new = "from '${prefix}lib/prisma'" }
    )
    
    $updated = $false
    foreach ($pattern in $patterns) {
        if ($content -match $pattern.old) {
            $content = $content -replace $pattern.old, $pattern.new
            $updated = $true
        }
    }
    
    if ($updated) {
        Set-Content -Path $file.FullName -Value $content
        Write-Host "Atualizado: $($file.FullName)"
        $count++
    }
}

Write-Host "Total de arquivos atualizados: $count"
