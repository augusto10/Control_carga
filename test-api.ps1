$username = "erp@santri.com.br"
$password = "PASSkey@2025"
$base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${username}:${password}"))
$headers = @{
    "Authorization" = "Basic $base64Auth"
    "Accept" = "application/json"
}

Write-Host "=== Testando Apurações ===" -ForegroundColor Green
try {
    $apuracoes = Invoke-RestMethod -Uri "http://ec2-15-229-152-29.sa-east-1.compute.amazonaws.com/api/v1/apuracoes?limit=1" -Headers $headers -Method Get
    Write-Host "Apuração encontrada:" -ForegroundColor Yellow
    $apuracoes | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Erro ao buscar apurações: $_" -ForegroundColor Red
}

Write-Host "`n=== Testando Pedidos ===" -ForegroundColor Green
try {
    $pedidos = Invoke-RestMethod -Uri "http://ec2-15-229-152-29.sa-east-1.compute.amazonaws.com/api/v1/pedidos?limit=1" -Headers $headers -Method Get
    Write-Host "Pedido encontrado:" -ForegroundColor Yellow
    $pedidos | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Erro ao buscar pedidos: $_" -ForegroundColor Red
}
