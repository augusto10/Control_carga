# Script para corrigir imports de lib/prisma usando alias @/lib/prisma

$apiPath = "c:\Users\Apps\Documents\controle_carga\Control_carga\pages\api"
$files = Get-ChildItem -Path $apiPath -Recurse -Filter "*.ts" -Exclude "*.original.ts", "*-temp.ts"

$count = 0
foreach ($file in $files) {
    $content = [System.IO.File]::ReadAllText($file.FullName)
    $originalContent = $content
    
    # Substituir todos os padrões de import de lib/prisma por @/lib/prisma
    $content = $content -replace 'from [''"]\.+\/lib\/prisma[''"]', "from '@/lib/prisma'"
    
    if ($content -ne $originalContent) {
        [System.IO.File]::WriteAllText($file.FullName, $content)
        Write-Host "Atualizado: $($file.FullName)"
        $count++
    }
}

Write-Host "Total de arquivos atualizados: $count"
