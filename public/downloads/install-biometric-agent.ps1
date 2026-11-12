param(
  [string]$ServerBaseUrl = 'https://gestao-logistica.esplendoratacadista.com.br',
  [string]$AgentToken
)

$ErrorActionPreference = 'Stop'
$downloadUrl = "$($ServerBaseUrl.TrimEnd('/'))/downloads/control-carga-biometric-agent-win-x64.zip"
$installDir = Join-Path $env:LOCALAPPDATA 'ControlCarga\biometric-agent'
$zipPath = Join-Path $env:TEMP 'control-carga-biometric-agent-win-x64.zip'

function Test-AspNetRuntime8 {
  $dotnet = Get-Command dotnet.exe -ErrorAction SilentlyContinue
  if (-not $dotnet) {
    $userDotnet = Join-Path $env:USERPROFILE '.dotnet\dotnet.exe'
    if (Test-Path $userDotnet) { $dotnet = Get-Item $userDotnet }
  }
  if (-not $dotnet) { return $false }
  return [bool](& $dotnet.Source --list-runtimes | Select-String '^Microsoft\.AspNetCore\.App 8\.')
}

Write-Host 'Instalador do agente biometrico ControlCarga' -ForegroundColor Cyan

if (-not (Test-AspNetRuntime8)) {
  $winget = Get-Command winget.exe -ErrorAction SilentlyContinue
  if (-not $winget) {
    throw 'O .NET 8 ASP.NET Core Runtime nao esta instalado e o winget nao foi encontrado. Instale o Hosting Bundle .NET 8 e execute novamente.'
  }
  Write-Host 'Instalando o .NET 8 ASP.NET Core Runtime...'
  & $winget.Source install --id Microsoft.DotNet.AspNetCore.8 --exact --silent `
    --accept-package-agreements --accept-source-agreements
  if ($LASTEXITCODE -ne 0 -or -not (Test-AspNetRuntime8)) {
    throw 'Nao foi possivel instalar ou localizar o .NET 8 ASP.NET Core Runtime.'
  }
}

if ([string]::IsNullOrWhiteSpace($AgentToken)) {
  $secureToken = Read-Host 'Cole o BIOMETRIA_AGENT_TOKEN configurado no Vercel' -AsSecureString
  $tokenPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureToken)
  try { $AgentToken = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($tokenPointer) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($tokenPointer) }
}
if ([string]::IsNullOrWhiteSpace($AgentToken)) { throw 'O token do agente e obrigatorio.' }

Write-Host 'Baixando o agente...'
Invoke-WebRequest -UseBasicParsing -Uri $downloadUrl -OutFile $zipPath
New-Item -ItemType Directory -Path $installDir -Force | Out-Null
Get-Process -Name 'biometric-agent' -ErrorAction SilentlyContinue | Stop-Process -Force
Expand-Archive -LiteralPath $zipPath -DestinationPath $installDir -Force

$origin = ([Uri]$ServerBaseUrl).GetLeftPart([UriPartial]::Authority)
$config = @{
  BiometriaAgent = @{
    ServerBaseUrl = $ServerBaseUrl.TrimEnd('/')
    AgentToken = $AgentToken
    AllowedOrigins = @($origin)
  }
}
$config | ConvertTo-Json -Depth 5 | Set-Content `
  -LiteralPath (Join-Path $installDir 'appsettings.json') -Encoding utf8
$AgentToken = $null

$exe = Join-Path $installDir 'biometric-agent.exe'
$startup = [Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startup 'ControlCarga Biometria.lnk'
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $exe
$shortcut.WorkingDirectory = $installDir
$shortcut.WindowStyle = 7
$shortcut.Description = 'Agente biometrico ControlCarga SecuGen'
$shortcut.Save()

Start-Process -FilePath $exe -WorkingDirectory $installDir -WindowStyle Hidden
Start-Sleep -Seconds 3
$health = Invoke-RestMethod -Uri 'http://127.0.0.1:17876/health' -TimeoutSec 5
Remove-Item -LiteralPath $zipPath -Force -ErrorAction SilentlyContinue

Write-Host "Instalacao concluida. Status: $($health.status); dispositivo: $($health.device)" -ForegroundColor Green
Write-Host 'Se o leitor nao acender durante a captura, instale o driver SecuGen U20-A neste computador.'
