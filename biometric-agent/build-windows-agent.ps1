param(
  [Parameter(Mandatory = $true)]
  [string]$SecuGenSdkRoot,
  [string]$OutputPath = (Join-Path $env:LOCALAPPDATA 'ControlCarga\biometric-agent')
)

$managedSdk = Join-Path $SecuGenSdkRoot 'DotNET\Bin\x64\SecuGen.FDxSDKPro.DotNet.Windows.dll'
$nativeSdkRoot = Join-Path $SecuGenSdkRoot 'bin\x64'

if (-not (Test-Path $managedSdk)) {
  throw "Biblioteca SecuGen não encontrada: $managedSdk"
}

foreach ($name in @('sgfpamx.dll', 'sgfplib.dll', 'sgwsqlib.dll')) {
  if (-not (Test-Path (Join-Path $nativeSdkRoot $name))) {
    throw "Dependência SecuGen não encontrada: $(Join-Path $nativeSdkRoot $name)"
  }
}

dotnet publish (Join-Path $PSScriptRoot 'biometric-agent.csproj') `
  --configuration Release `
  --runtime win-x64 `
  --self-contained true `
  --output $OutputPath `
  "-p:SecuGenSdkRoot=$SecuGenSdkRoot"

if ($LASTEXITCODE -ne 0) {
  throw "Falha ao compilar o agente biométrico (código $LASTEXITCODE)."
}

foreach ($name in @('sgfpamx.dll', 'sgfplib.dll', 'sgwsqlib.dll')) {
  Copy-Item (Join-Path $nativeSdkRoot $name) -Destination $OutputPath -Force
}

if (-not (Test-Path (Join-Path $OutputPath 'appsettings.json'))) {
  Copy-Item (Join-Path $PSScriptRoot 'appsettings.example.json') `
    -Destination (Join-Path $OutputPath 'appsettings.json')
}

Write-Output "Agente publicado em: $OutputPath"
