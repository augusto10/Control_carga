$headers = @{
    "accept" = "application/json"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlcnBAc2FudHJpLmNvbS5iciIsImV4cCI6MTc3MDQwNTA5NH0.8v3Dl8y1VUIC5lYpQ76coLPIuX1kBkju9uRN34B9iR4"
}

Write-Host "=== Testando Apurações com Bearer ===" -ForegroundColor Green
try {
    $apuracoes = Invoke-RestMethod -Uri "http://ec2-15-229-152-29.sa-east-1.compute.amazonaws.com/api/v1/apuracoes?limit=2&offset=0" -Headers $headers -Method Get
    Write-Host "Total de apurações: $($apuracoes.total)" -ForegroundColor Yellow
    Write-Host "Apurações retornadas: $($apuracoes.data.Count)" -ForegroundColor Yellow
    
    if ($apuracoes.data -and $apuracoes.data.Count -gt 0) {
        Write-Host "`nPrimeira apuração:" -ForegroundColor Cyan
        $apuracoes.data[0] | ConvertTo-Json -Depth 3
    }
} catch {
    Write-Host "Erro: $_" -ForegroundColor Red
}
